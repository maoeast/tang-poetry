/**
 * Batch-generate TTS audio for AI poetry explanations using StepFun.
 *
 * For each poem with cached AI explanations, generates MP3 audio files:
 *   - child_v1  → voice: yuanqishaonv (元气少女)
 *   - general_v1 → voice: linjiajiejie (邻家姐姐)
 *
 * Audio files are saved to: public/audio/explain/{poetryId}_{audience}.mp3
 *
 * Supports:
 *   - Resume/checkpoint — skips existing MP3 files
 *   - Rate limiting — configurable delay between requests
 *   - Retry with backoff — retries up to 3 times on failure
 *
 * Usage:
 *   npx tsx scripts/generate-explain-audio.ts                          # dry run
 *   npx tsx scripts/generate-explain-audio.ts --write                  # generate audio
 *   npx tsx scripts/generate-explain-audio.ts --write --concurrency 50 # 50 parallel
 *   npx tsx scripts/generate-explain-audio.ts --write --id ts300-0001
 *   npx tsx scripts/generate-explain-audio.ts --write --limit 5
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { getExplanationCacheKey, type ExplanationAudience } from "@/lib/ai/prompts";
import type { PoetryExplanation } from "@/lib/ai/deepseek";

import { loadEnvFiles } from "./lib/load-env.js";

loadEnvFiles();

const prisma = new PrismaClient();

// ─── Config ─────────────────────────────────────────────────────────

const STEP_BASE_URL =
  process.env.STEPFUN_BASE_URL ?? "https://api.stepfun.com/step_plan/v1";
const MODEL = "stepaudio-2.5-tts";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 30000;
const MAX_CHARS = 950;

const VOICE_MAP: Record<ExplanationAudience, string> = {
  child: "yuanqishaonv",
  general: "linjiajiejie",
};

const INSTRUCTION_MAP: Record<ExplanationAudience, string> = {
  child: "用元气少女的亲切活泼口吻为小朋友讲解唐诗，语速适中，温柔耐心，适合儿童聆听",
  general: "用邻家姐姐的亲切知性口吻讲解唐诗，语速适中，自然流畅，适合一般学习者聆听",
};

const AUDIENCES: ExplanationAudience[] = ["child", "general"];

const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "audio", "explain");

// ─── CLI ────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const shouldWrite = args.includes("--write");

  const rateLimitIndex = args.indexOf("--rate-limit");
  const rateLimitMs =
    rateLimitIndex !== -1 && args[rateLimitIndex + 1]
      ? parseInt(args[rateLimitIndex + 1], 10)
      : 2000;

  const ids: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--id" && args[i + 1]) {
      ids.push(args[i + 1]);
      i++;
    }
  }

  const limitIndex = args.indexOf("--limit");
  const limit =
    limitIndex !== -1 && args[limitIndex + 1]
      ? parseInt(args[limitIndex + 1], 10)
      : 0;

  const concurrencyIndex = args.indexOf("--concurrency");
  const concurrency =
    concurrencyIndex !== -1 && args[concurrencyIndex + 1]
      ? parseInt(args[concurrencyIndex + 1], 10)
      : 1;

  return { shouldWrite, rateLimitMs, ids, limit, concurrency };
}

// ─── Helpers ────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBackoffDelay(attempt: number): number {
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
}

function getOutputPath(poetryId: string, audience: ExplanationAudience): string {
  return path.join(OUTPUT_DIR, `${poetryId}_${audience}.mp3`);
}

type AiExplanationCache = Record<string, PoetryExplanation>;

function toCacheMap(raw: unknown): AiExplanationCache {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as AiExplanationCache;
}

function buildExplanationText(explanation: PoetryExplanation): string {
  return [explanation.summary, explanation.imagery, explanation.emotion].join("\n");
}

// ─── StepFun TTS API call ───────────────────────────────────────────

async function callStepFunTTS(
  text: string,
  voice: string,
  instruction: string,
): Promise<ArrayBuffer> {
  const apiKey = process.env.STEPFUN_API_KEY;
  if (!apiKey) throw new Error("Missing STEPFUN_API_KEY.");

  const response = await fetch(`${STEP_BASE_URL}/audio/speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      voice,
      input: text,
      response_format: "mp3",
      speed: 1.0,
      extra_body: { instruction },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `StepFun TTS failed (${response.status}): ${body.slice(0, 200)}`,
    );
  }

  return response.arrayBuffer();
}

async function retryTTS(
  text: string,
  voice: string,
  instruction: string,
): Promise<ArrayBuffer | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callStepFunTTS(text, voice, instruction);
    } catch (error: unknown) {
      const isLast = attempt === MAX_RETRIES;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (isLast) {
        console.error(
          `    FAILED after ${MAX_RETRIES + 1} attempts: ${errorMessage}`,
        );
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

// ─── Main ───────────────────────────────────────────────────────────

// ─── Process single work item ────────────────────────────────────────

type WorkItem = {
  poetryId: string;
  title: string;
  author: string;
  audience: ExplanationAudience;
  explanation: PoetryExplanation;
};

type WorkResult = {
  item: WorkItem;
  ok: boolean;
  sizeKB?: number;
  error?: string;
};

async function processItem(item: WorkItem): Promise<WorkResult> {
  const voice = VOICE_MAP[item.audience];
  const instruction = INSTRUCTION_MAP[item.audience];
  const outputPath = getOutputPath(item.poetryId, item.audience);

  // Double-check file existence (for resume)
  if (existsSync(outputPath)) {
    return { item, ok: true, sizeKB: 0 }; // already exists
  }

  const text = buildExplanationText(item.explanation);
  const truncated = text.length > MAX_CHARS;
  const effectiveText = truncated ? text.slice(0, MAX_CHARS) : text;

  const audioBuffer = await retryTTS(effectiveText, voice, instruction);

  if (audioBuffer) {
    writeFileSync(outputPath, Buffer.from(audioBuffer));
    const sizeKB = Math.round(audioBuffer.byteLength / 1024);
    return { item, ok: true, sizeKB };
  }

  return { item, ok: false, error: "all retries failed" };
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const { shouldWrite, rateLimitMs, ids, limit, concurrency } = parseArgs();

  console.log(
    shouldWrite
      ? "🔊 Generating explanation audio files..."
      : "📋 Dry run — use --write to generate audio",
  );
  console.log(`   Model: ${MODEL}`);
  console.log(`   Base URL: ${STEP_BASE_URL}`);
  console.log(`   Output: ${OUTPUT_DIR}`);
  console.log(`   Concurrency: ${concurrency}`);
  console.log(`   Rate limit: ${rateLimitMs}ms (between batches)`);

  if (shouldWrite) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load poems with explanations
  const where = ids.length > 0 ? { id: { in: ids } } : {};
  const poems = await prisma.poetry.findMany({
    where,
    select: {
      id: true,
      title: true,
      author: true,
      aiExplanation: true,
    },
    orderBy: { id: "asc" },
  });

  // Build work list: (poem, audience) pairs that need audio
  const workList: WorkItem[] = [];
  for (const poem of poems) {
    const cache = toCacheMap(poem.aiExplanation);
    for (const audience of AUDIENCES) {
      const cacheKey = getExplanationCacheKey(audience);
      const explanation = cache[cacheKey];
      if (!explanation) continue;

      const outputPath = getOutputPath(poem.id, audience);
      if (existsSync(outputPath)) continue; // resume checkpoint

      workList.push({
        poetryId: poem.id,
        title: poem.title,
        author: poem.author,
        audience,
        explanation,
      });
    }
  }

  const effectiveWork = limit > 0 ? workList.slice(0, limit) : workList;

  console.log(
    `\nFound ${poems.length} poems, ${workList.length} audio files to generate (${workList.length - effectiveWork.length} limited)`,
  );

  if (effectiveWork.length === 0) {
    console.log("Nothing to do — all audio files already exist.");
    await prisma.$disconnect();
    return;
  }

  if (!shouldWrite) {
    console.log(`\n[dry-run] Would generate ${effectiveWork.length} audio files with concurrency=${concurrency}`);
    console.log("\n💡 Run with --write to generate audio files.");
    await prisma.$disconnect();
    return;
  }

  // Process in parallel batches
  let success = 0;
  let failed = 0;
  let totalProcessed = 0;
  const failedList: WorkItem[] = [];
  const batchSize = concurrency;

  for (let i = 0; i < effectiveWork.length; i += batchSize) {
    const batch = effectiveWork.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(effectiveWork.length / batchSize);

    console.log(
      `\n📦 Batch ${batchNum}/${totalBatches} — ${batch.length} items (total: ${totalProcessed + batch.length}/${effectiveWork.length})`,
    );

    const results = await Promise.allSettled(
      batch.map((item) => processItem(item)),
    );

    for (const result of results) {
      totalProcessed++;
      if (result.status === "fulfilled") {
        const r = result.value;
        if (r.ok) {
          if (r.sizeKB && r.sizeKB > 0) {
            success++;
          }
        } else {
          failed++;
          failedList.push(r.item);
          console.error(
            `  ❌ ${r.item.author}《${r.item.title}》 ${getExplanationCacheKey(r.item.audience)} — ${r.error}`,
          );
        }
      } else {
        failed++;
        // result.reason contains the rejection error
        const item = batch[results.indexOf(result)];
        if (item) failedList.push(item);
        console.error(`  ❌ Unexpected error: ${result.reason}`);
      }
    }

    const batchSuccess = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok && (r.value.sizeKB ?? 0) > 0,
    ).length;
    console.log(
      `  ✅ Batch done: ${batchSuccess} generated, ${batch.length - batchSuccess} skipped/failed`,
    );

    // Rate limit between batches
    if (i + batchSize < effectiveWork.length) {
      await sleep(rateLimitMs);
    }
  }

  // Summary
  console.log("\n📊 Results:");
  console.log(`  Generated: ${success}`);
  console.log(`  Failed: ${failedList.length}`);
  console.log(`  Total processed: ${totalProcessed}`);

  if (failedList.length > 0) {
    console.log("\n❌ Failed items:");
    for (const f of failedList) {
      console.log(
        `  ${f.author}《${f.title}》— ${getExplanationCacheKey(f.audience)}`,
      );
    }
  }
}

main()
  .catch((e) => {
    console.error("❌ Fatal error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
