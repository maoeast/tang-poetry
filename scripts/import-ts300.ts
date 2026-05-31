import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { db } from "@/lib/db";
import { buildDailyPoetrySeeds } from "@/lib/poetry/daily-seed";
import {
  normalizeTs300Poems,
  type RawTs300Poem,
} from "@/lib/poetry/normalize";

const DATA_DIR = path.join(process.cwd(), "data");
const RAW_FILE_PATH = path.join(DATA_DIR, "ts300.raw.json");
const NORMALIZED_FILE_PATH = path.join(DATA_DIR, "poetries.normalized.json");
const RAW_TS300_URL =
  "https://raw.githubusercontent.com/chinese-poetry/chinese-poetry/master/%E5%85%A8%E5%94%90%E8%AF%97/%E5%94%90%E8%AF%97%E4%B8%89%E7%99%BE%E9%A6%96.json";

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function loadRawTs300Poems(): Promise<RawTs300Poem[]> {
  await ensureDataDir();

  try {
    const raw = await readFile(RAW_FILE_PATH, "utf8");
    return JSON.parse(raw) as RawTs300Poem[];
  } catch {
    const response = await fetch(RAW_TS300_URL);

    if (!response.ok) {
      throw new Error(`Failed to download ts300 raw data: ${response.status}`);
    }

    const raw = await response.text();
    await writeFile(RAW_FILE_PATH, raw, "utf8");

    return JSON.parse(raw) as RawTs300Poem[];
  }
}

async function writeNormalizedJson(data: unknown) {
  await ensureDataDir();
  await writeFile(NORMALIZED_FILE_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function writePoetriesToDb(
  poetries: ReturnType<typeof normalizeTs300Poems>,
) {
  for (const poetry of poetries) {
    await db.poetry.upsert({
      where: { id: poetry.id },
      create: {
        id: poetry.id,
        sourceId: poetry.sourceId,
        sourceUid: poetry.sourceUid,
        title: poetry.title,
        titleOriginal: poetry.titleOriginal,
        author: poetry.author,
        authorOriginal: poetry.authorOriginal,
        dynasty: poetry.dynasty,
        lines: poetry.lines,
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
        author: poetry.author,
        authorOriginal: poetry.authorOriginal,
        dynasty: poetry.dynasty,
        lines: poetry.lines,
        tags: poetry.tags,
        themes: poetry.themes,
        difficulty: poetry.difficulty,
        imageKey: poetry.imageKey,
        imageStatus: poetry.imageStatus,
      },
    });
  }
}

async function writeDailySeedsToDb(seeds: ReturnType<typeof buildDailyPoetrySeeds>) {
  for (const seed of seeds) {
    await db.dailyPoetry.upsert({
      where: { date: seed.date },
      create: seed,
      update: { poetryId: seed.poetryId },
    });
  }
}

async function main() {
  const rawPoems = await loadRawTs300Poems();
  const poetries = normalizeTs300Poems(rawPoems);
  const dailySeeds = buildDailyPoetrySeeds(
    poetries.map((poetry) => poetry.id),
    new Date(),
    365,
  );

  await writeNormalizedJson(poetries);

  let dbImported = false;

  try {
    await writePoetriesToDb(poetries);
    await writeDailySeedsToDb(dailySeeds);
    dbImported = true;
  } catch (error) {
    console.warn("Skipped PostgreSQL import:", error);
  } finally {
    await db.$disconnect();
  }

  console.log(
    JSON.stringify(
      {
        rawCount: rawPoems.length,
        normalizedCount: poetries.length,
        dailySeedCount: dailySeeds.length,
        normalizedPath: path.relative(process.cwd(), NORMALIZED_FILE_PATH),
        dbImported,
      },
      null,
      2,
    ),
  );
}

void main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exitCode = 1;
});
