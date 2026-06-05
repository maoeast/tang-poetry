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
 *   npx tsx scripts/generate-explain-audio.ts               # dry run
 *   npx tsx scripts/generate-explain-audio.ts --write        # generate audio
 *   npx tsx scripts/generate-explain-audio.ts --write --rate-limit 2000
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

  return { shouldWrite, rateLimitMs, ids, limit };
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

async function main() {
  const { shouldWrite, rateLimitMs, ids, limit } = parseArgs();

  console.log(
    shouldWrite
      ? "🔊 Generating explanation audio files..."
      : "📋 Dry run — use --write to generate audio",
  );
  console.log(`   Model: ${MODEL}`);
  console.log(`   Base URL: ${STEP_BASE_URL}`);
  console.log(`   Output: ${OUTPUT_DIR}`);
  console.log(`   Rate limit: ${rateLimitMs}ms`);

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
  type WorkItem = {
    poetryId: string;
    title: string;
    author: string;
    audience: ExplanationAudience;
    explanation: PoetryExplanation;
  };

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

  let success = 0;
  let skipped = 0;
  const failedList: Array<{
    index: number;
    title: string;
    author: string;
    audience: string;
  }> = [];

  for (let i = 0; i < effectiveWork.length; i++) {
    const item = effectiveWork[i];
    const prefix = `[${i + 1}/${effectiveWork.length}]`;
    const voice = VOICE_MAP[item.audience];
    const instruction = INSTRUCTION_MAP[item.audience];
    const cacheKey = getExplanationCacheKey(item.audience);
    const outputPath = getOutputPath(item.poetryId, item.audience);

    // Double-check file existence (for resume)
    if (existsSync(outputPath)) {
      console.log(
        `${prefix} ${item.author}《${item.title}》 ${cacheKey} — already exists, skip`,
      );
      skipped++;
      continue;
    }

    const text = buildExplanationText(item.explanation);
    const truncated = text.length > MAX_CHARS;
    const effectiveText = truncated ? text.slice(0, MAX_CHARS) : text;

    console.log(
      `${prefix} ${item.author}《${item.title}》 ${cacheKey} — ${effectiveText.length}字, voice: ${voice}${truncated ? " (truncated)" : ""}`,
    );

    if (!shouldWrite) {
      console.log(`    [dry-run] would call StepFun TTS`);
      continue;
    }

    const audioBuffer = await retryTTS(effectiveText, voice, instruction);

    if (audioBuffer) {
      writeFileSync(outputPath, Buffer.from(audioBuffer));
      const sizeKB = Math.round(audioBuffer.byteLength / 1024);
      console.log(`    OK — ${sizeKB}KB saved to ${path.basename(outputPath)}`);
      success++;
    } else {
      failedList.push({
        index: i + 1,
        title: item.title,
        author: item.author,
        audience: cacheKey,
      });
    }

    // Rate limit between requests
    if (i < effectiveWork.length - 1 && shouldWrite) {
      await sleep(rateLimitMs);
    }
  }

  // Summary
  console.log("\n📊 Results:");
  console.log(`  Generated: ${success}`);
  console.log(`  Skipped (already exist): ${skipped}`);
  console.log(`  Failed: ${failedList.length}`);

  if (failedList.length > 0) {
    console.log("\n❌ Failed items:");
    for (const f of failedList) {
      console.log(
        `  #${f.index} ${f.author}《${f.title}》— ${f.audience}`,
      );
    }
  }

  if (!shouldWrite && effectiveWork.length > 0) {
    console.log(
      "\n💡 Run with --write to generate audio files.",
    );
  }
}

main()
  .catch((e) => {
    console.error("❌ Fatal error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
