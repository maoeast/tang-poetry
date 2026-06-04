import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { pinyin as pinyinFn } from "pinyin-pro";

import { db } from "@/lib/db";
import { buildDailyPoetrySeeds } from "@/lib/poetry/daily-seed";
import {
  normalizeTs300Poems,
  type NormalizedPoem,
  type RawTs300Poem,
} from "@/lib/poetry/normalize";

const CJK_REGEX = /[一-鿿㐀-䶿]/u;

/**
 * Generate a space-separated pinyin string for the CJK characters in a line.
 * Non-CJK characters (punctuation) are skipped so renderRubyText() pairs
 * syllables 1:1 with CJK chars.
 */
function lineToPinyin(line: string): string {
  const chars = [...line];
  const cjkChars = chars.filter((ch) => CJK_REGEX.test(ch));

  if (cjkChars.length === 0) return "";

  const syllables = pinyinFn(cjkChars.join(""), {
    toneType: "symbol",
    type: "array",
  });

  return syllables.join(" ");
}

const DATA_DIR = path.join(process.cwd(), "data");
const SIMPLE_FILE_PATH = path.join(DATA_DIR, "ts300.simple.json");
const RAW_FILE_PATH = path.join(DATA_DIR, "ts300.raw.json");
const NORMALIZED_FILE_PATH = path.join(DATA_DIR, "poetries.normalized.json");
const DEFAULT_DAILY_SEED_DAYS = 365;

export type ImportPayload = {
  poetries: NormalizedPoem[];
  dailySeeds: ReturnType<typeof buildDailyPoetrySeeds>;
};

export type ImportResult = ImportPayload & {
  simpleCount: number;
  rawCount: number;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

function validateRequiredPoemFields(
  poem: RawTs300Poem,
  index: number,
  sourceLabel: "simple" | "raw",
) {
  if (!isNonEmptyString(poem.id)) {
    throw new Error(`${sourceLabel} poem at index ${index} has invalid id`);
  }

  if (!isNonEmptyString(poem.title)) {
    throw new Error(`${sourceLabel} poem at index ${index} has invalid title`);
  }

  if (!isNonEmptyString(poem.author)) {
    throw new Error(`${sourceLabel} poem at index ${index} has invalid author`);
  }

  if (!isStringArray(poem.paragraphs)) {
    throw new Error(`${sourceLabel} poem at index ${index} has invalid paragraphs`);
  }
}

export function validateTs300PoemPairing(
  simplePoems: RawTs300Poem[],
  rawPoems: RawTs300Poem[],
) {
  if (simplePoems.length !== rawPoems.length) {
    throw new Error(
      `ts300 source length mismatch: simple=${simplePoems.length}, raw=${rawPoems.length}`,
    );
  }

  for (const [index, simplePoem] of simplePoems.entries()) {
    const rawPoem = rawPoems[index];

    if (!rawPoem) {
      throw new Error(`raw poem at index ${index} is missing`);
    }

    validateRequiredPoemFields(simplePoem, index, "simple");
    validateRequiredPoemFields(rawPoem, index, "raw");

    if (simplePoem.id !== rawPoem.id) {
      throw new Error(
        `ts300 uuid mismatch at index ${index}: simple=${simplePoem.id}, raw=${rawPoem.id}`,
      );
    }
  }
}

export function buildImportPayload(
  simplePoems: RawTs300Poem[],
  rawPoems: RawTs300Poem[],
  startDate = new Date(),
  totalDays = DEFAULT_DAILY_SEED_DAYS,
): ImportPayload {
  validateTs300PoemPairing(simplePoems, rawPoems);

  const poetries = normalizeTs300Poems(simplePoems, rawPoems);
  const dailySeeds = buildDailyPoetrySeeds(
    poetries.map((poetry) => poetry.id),
    startDate,
    totalDays,
  );

  return {
    poetries,
    dailySeeds,
  };
}

export function summarizeImportResult(result: ImportResult) {
  return {
    simpleCount: result.simpleCount,
    rawCount: result.rawCount,
    normalizedCount: result.poetries.length,
    dailySeedCount: result.dailySeeds.length,
  };
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function loadJsonFile(filePath: string): Promise<RawTs300Poem[]> {
  await ensureDataDir();

  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as RawTs300Poem[];
}

export async function loadTs300Sources() {
  const [simplePoems, rawPoems] = await Promise.all([
    loadJsonFile(SIMPLE_FILE_PATH),
    loadJsonFile(RAW_FILE_PATH),
  ]);

  return {
    simplePoems,
    rawPoems,
  };
}

async function writeNormalizedJson(data: unknown) {
  await ensureDataDir();
  await writeFile(NORMALIZED_FILE_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function buildPoetryUpsert(poetry: NormalizedPoem) {
  const pinyinLines = poetry.linesZhHans.map((line) => lineToPinyin(line));

  return {
    where: { id: poetry.id },
    create: {
      id: poetry.id,
      sourceId: poetry.sourceId,
      sourceUid: poetry.sourceUid,
      title: poetry.title,
      titleOriginal: poetry.titleOriginal,
      titleZhHans: poetry.titleZhHans,
      titleZhHant: poetry.titleZhHant,
      author: poetry.author,
      authorOriginal: poetry.authorOriginal,
      authorZhHans: poetry.authorZhHans,
      authorZhHant: poetry.authorZhHant,
      dynasty: poetry.dynasty,
      lines: poetry.lines,
      linesZhHans: poetry.linesZhHans,
      linesZhHant: poetry.linesZhHant,
      pinyin: pinyinLines,
      tags: poetry.tags,
      themes: poetry.themes,
      difficulty: poetry.difficulty,
      imageKey: poetry.imageKey,
      imageStatus: poetry.imageStatus,
    },
    update: {
      sourceId: poetry.sourceId,
      sourceUid: poetry.sourceUid,
      title: poetry.title,
      titleOriginal: poetry.titleOriginal,
      titleZhHans: poetry.titleZhHans,
      titleZhHant: poetry.titleZhHant,
      author: poetry.author,
      authorOriginal: poetry.authorOriginal,
      authorZhHans: poetry.authorZhHans,
      authorZhHant: poetry.authorZhHant,
      dynasty: poetry.dynasty,
      lines: poetry.lines,
      linesZhHans: poetry.linesZhHans,
      linesZhHant: poetry.linesZhHant,
      pinyin: pinyinLines,
      tags: poetry.tags,
      themes: poetry.themes,
      difficulty: poetry.difficulty,
      imageKey: poetry.imageKey,
      imageStatus: poetry.imageStatus,
    },
  };
}

export async function writeImportPayloadToDb(payload: ImportPayload) {
  await db.$transaction(async (tx) => {
    for (const poetry of payload.poetries) {
      await tx.poetry.upsert(buildPoetryUpsert(poetry));
    }

    for (const seed of payload.dailySeeds) {
      await tx.dailyPoetry.upsert({
        where: { date: seed.date },
        create: seed,
        update: { poetryId: seed.poetryId },
      });
    }
  });
}

export async function runImport({
  startDate = new Date(),
  totalDays = DEFAULT_DAILY_SEED_DAYS,
}: {
  startDate?: Date;
  totalDays?: number;
} = {}): Promise<ImportResult> {
  const { simplePoems, rawPoems } = await loadTs300Sources();
  const payload = buildImportPayload(simplePoems, rawPoems, startDate, totalDays);

  await writeNormalizedJson(payload.poetries);
  await writeImportPayloadToDb(payload);

  return {
    simpleCount: simplePoems.length,
    rawCount: rawPoems.length,
    ...payload,
  };
}

async function main() {
  try {
    const result = await runImport();

    console.log(
      JSON.stringify(
        {
          ...summarizeImportResult(result),
          normalizedPath: path.relative(process.cwd(), NORMALIZED_FILE_PATH),
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}

const entrypointUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;

if (entrypointUrl && import.meta.url === entrypointUrl) {
  void main().catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exitCode = 1;
  });
}
