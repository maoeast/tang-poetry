/**
 * Batch-generate AI explanations for all poems using DeepSeek.
 *
 * For each poem, generates `child_v1` and `general_v1` explanations
 * and writes them into the `Poetry.aiExplanation` JSONB field.
 *
 * Supports:
 *   - Dry-run mode (default) — prints stats without writing
 *   - Resume/checkpoint — skips poems that already have both cache keys
 *   - Rate limiting — configurable delay between poems
 *   - Retry with backoff — retries up to 3 times on failure
 *
 * Usage:
 *   npx tsx scripts/generate-ai-explanations.ts                              # dry run
 *   npx tsx scripts/generate-ai-explanations.ts --write                       # write to DB
 *   npx tsx scripts/generate-ai-explanations.ts --write --rate-limit 3000
 *   npx tsx scripts/generate-ai-explanations.ts --write --id <poetryId>
 *   npx tsx scripts/generate-ai-explanations.ts --write --concurrency 5       # parallel workers
 *
 * Concurrency: with --concurrency N, N workers process poems in parallel.
 * rate-limit is applied per worker (delay after each poem completes within
 * that worker). Retry/backoff handles transient 429s from DeepSeek.
 */

import { PrismaClient } from "@prisma/client";

import { explainPoetry, type PoetryExplanation } from "@/lib/ai/deepseek";
import {
  getExplanationCacheKey,
  type ExplanationAudience,
} from "@/lib/ai/prompts";

import { loadEnvFiles } from "./lib/load-env.js";

loadEnvFiles();

const prisma = new PrismaClient();

const AUDIENCES: ExplanationAudience[] = ["child", "general"];
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 30000;

// ─── CLI helpers ────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const shouldWrite = args.includes("--write");
  const rateLimitIndex = args.indexOf("--rate-limit");
  const rateLimitMs =
    rateLimitIndex !== -1 && args[rateLimitIndex + 1]
      ? parseInt(args[rateLimitIndex + 1], 10)
      : 2000;

  const concurrencyIndex = args.indexOf("--concurrency");
  const concurrency =
    concurrencyIndex !== -1 && args[concurrencyIndex + 1]
      ? Math.max(1, parseInt(args[concurrencyIndex + 1], 10))
      : 1;

  const ids: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--id" && args[i + 1]) {
      ids.push(args[i + 1]);
      i++; // skip value
    }
  }

  return { shouldWrite, rateLimitMs, concurrency, ids };
}

// ─── Retry with exponential backoff ─────────────────────────────────

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBackoffDelay(attempt: number): number {
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
}

async function retryExplainPoetry(
  input: Parameters<typeof explainPoetry>[0],
): Promise<PoetryExplanation | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await explainPoetry(input);
    } catch (error: unknown) {
      const isLast = attempt === MAX_RETRIES;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (isLast) {
        console.error(`    FAILED after ${MAX_RETRIES + 1} attempts: ${errorMessage}`);
        return null;
      }

      const delay = getBackoffDelay(attempt);
      console.warn(
        `    Retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms: ${errorMessage}`,
      );
      await sleep(delay);
    }
  }

  return null;
}

// ─── Cache helpers ──────────────────────────────────────────────────

type AiExplanationCache = Record<string, PoetryExplanation>;

function toCacheMap(raw: unknown): AiExplanationCache {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as AiExplanationCache;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

// ─── Progress logging ───────────────────────────────────────────────

function logExplanation(audience: string, explanation: PoetryExplanation) {
  const summaryLen = explanation.summary.length;
  const imageryLen = explanation.imagery.length;
  const emotionLen = explanation.emotion.length;
  console.log(
    `    OK — ${audience} cached (summary: ${summaryLen}字, imagery: ${imageryLen}字, emotion: ${emotionLen}字)`,
  );
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const { shouldWrite, rateLimitMs, concurrency, ids } = parseArgs();

  console.log(
    shouldWrite
      ? "🔄 Generating AI explanations and writing to DB..."
      : "📋 Dry run — use --write to persist changes",
  );
  console.log(`   Rate limit: ${rateLimitMs}ms per worker between poems`);
  console.log(`   Concurrency: ${concurrency} worker(s)`);

  // Load poems
  const where = ids.length > 0 ? { id: { in: ids } } : {};
  const poems = await prisma.poetry.findMany({
    where,
    select: {
      id: true,
      title: true,
      author: true,
      lines: true,
      aiExplanation: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${poems.length} poems`);

  // Filter: only process poems that are missing at least one audience
  const todo = poems.filter((poem) => {
    const cache = toCacheMap(poem.aiExplanation);
    return AUDIENCES.some(
      (audience) => !cache[getExplanationCacheKey(audience)],
    );
  });

  console.log(`Need to process ${todo.length} poems (rest already cached)\n`);

  let successCount = 0;
  let skippedCount = 0;
  const failedList: Array<{ index: number; title: string; author: string; errors: string[] }> = [];
  let nextIndex = 0;

  async function processPoem(workerId: number, index: number) {
    const poem = todo[index];
    if (!poem) return;
    const prefix = `[${index + 1}/${todo.length}](w${workerId})`;
    const cache = toCacheMap(poem.aiExplanation);
    const lines = toStringArray(poem.lines);
    const errors: string[] = [];

    let poemUpdated = false;

    for (const audience of AUDIENCES) {
      const cacheKey = getExplanationCacheKey(audience);

      if (cache[cacheKey]) {
        console.log(
          `${prefix} ${poem.author}《${poem.title}》 — ${cacheKey} already cached`,
        );
        skippedCount++;
        continue;
      }

      console.log(
        `${prefix} ${poem.author}《${poem.title}》 — generating ${cacheKey}...`,
      );

      if (!shouldWrite) {
        console.log(`    [dry-run] would call DeepSeek API`);
        continue;
      }

      const explanation = await retryExplainPoetry({
        title: poem.title,
        author: poem.author,
        lines,
        audience,
      });

      if (explanation) {
        cache[cacheKey] = explanation;
        poemUpdated = true;
        logExplanation(cacheKey, explanation);
        successCount++;
      } else {
        errors.push(cacheKey);
      }
    }

    // Write updated cache back to DB if anything changed
    if (shouldWrite && poemUpdated) {
      await prisma.poetry.update({
        where: { id: poem.id },
        data: { aiExplanation: cache },
      });
    }

    if (errors.length > 0) {
      failedList.push({
        index: index + 1,
        title: poem.title,
        author: poem.author,
        errors,
      });
    }
  }

  async function worker(workerId: number) {
    while (true) {
      const index = nextIndex++;
      if (index >= todo.length) return;
      await processPoem(workerId, index);
      // Per-worker rate limit between poems
      if (shouldWrite) {
        await sleep(rateLimitMs);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, (_, idx) => worker(idx + 1));
  await Promise.all(workers);

  // Summary
  console.log("\n📊 Results:");
  console.log(`  Generated: ${successCount}`);
  console.log(`  Skipped (already cached): ${skippedCount}`);
  console.log(`  Failed: ${failedList.length}`);

  if (failedList.length > 0) {
    console.log("\n❌ Failed poems:");
    for (const f of failedList) {
      console.log(`  #${f.index} ${f.author}《${f.title}》— missing: ${f.errors.join(", ")}`);
    }
  }

  if (!shouldWrite && todo.length > 0) {
    console.log(
      "\n💡 Run with --write to persist these changes to the database.",
    );
  }
}

main()
  .catch((e) => {
    console.error("❌ Fatal error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
