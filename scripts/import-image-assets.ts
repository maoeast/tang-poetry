import { readFile } from "node:fs/promises";
import path from "node:path";

import { db } from "@/lib/db";
import {
  buildImageAssetUpsertPayload,
  summarizeImageAssetImport,
  validateImageAssetRecords,
} from "@/lib/images/import-assets";

const IMAGE_ASSETS_FILE_PATH = path.join(process.cwd(), "data", "image-assets.json");

async function loadImageAssetRecords() {
  const raw = await readFile(IMAGE_ASSETS_FILE_PATH, "utf8");

  return validateImageAssetRecords(JSON.parse(raw) as unknown);
}

async function writeImageAssetsToDb(records: Awaited<ReturnType<typeof loadImageAssetRecords>>) {
  // Fetch all existing poetry IDs to skip orphan references
  const existingPoems = await db.poetry.findMany({ select: { id: true } });
  const validPoetryIds = new Set(existingPoems.map((p) => p.id));

  let skipped = 0;
  for (const record of records) {
    if (!validPoetryIds.has(record.poetryId)) {
      skipped++;
      continue;
    }
    const payload = buildImageAssetUpsertPayload(record);

    await db.imageAsset.upsert(payload);
  }
  if (skipped > 0) {
    console.log(`Skipped ${skipped} image assets with missing poetry IDs`);
  }
}

async function main() {
  const records = await loadImageAssetRecords();
  const summary = summarizeImageAssetImport(records);
  let dbImported = false;

  try {
    await writeImageAssetsToDb(records);
    dbImported = true;
  } catch (error) {
    console.warn("Skipped PostgreSQL image asset import:", error);
  } finally {
    await db.$disconnect();
  }

  console.log(
    JSON.stringify(
      {
        ...summary,
        sourcePath: path.relative(process.cwd(), IMAGE_ASSETS_FILE_PATH),
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
