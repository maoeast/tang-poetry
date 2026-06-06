import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import OpenCC from "opencc-js";

import { db } from "@/lib/db";
import {
  normalizeSingleSourcePoems,
  type NormalizedPoem,
  type RawPoem,
} from "@/lib/poetry/normalize";
import { buildPoetryUpsert, writeImportPayloadToDb } from "@/scripts/import-ts300";

const DATA_DIR = path.join(process.cwd(), "data");
const GS300_FILE = path.join(DATA_DIR, "gs300.simple.json");

const convertToTraditional = OpenCC.Converter({ from: "cn", to: "tw" });

// Dynasty ranges based on catalog order (after dedup removing 1 poem):
// 0-29: 先秦, 30-81: 魏晋, 82-198: 宋, 199-212: 元, 213-242: 明, 243+: 清
function gs300DynastyMap(_poem: RawPoem, index: number): string {
  if (index < 30) return "先秦";
  if (index < 82) return "魏晋";
  if (index < 199) return "宋";
  if (index < 213) return "元";
  if (index < 243) return "明";
  return "清";
}

async function main() {
  try {
    const raw = await readFile(GS300_FILE, "utf8");
    const poems = JSON.parse(raw) as RawPoem[];

    console.error(`Loaded ${poems.length} gs300 poems`);

    const poetries = normalizeSingleSourcePoems(poems, {
      idPrefix: "gs300",
      dynastyMap: gs300DynastyMap,
      convertToTraditional: convertToTraditional as (text: string) => string,
    });

    console.error(`Normalized ${poetries.length} poems`);

    await writeImportPayloadToDb({ poetries, dailySeeds: [] });

    // Print summary
    const dynastyCounts = new Map<string, number>();
    for (const p of poetries) {
      dynastyCounts.set(p.dynasty, (dynastyCounts.get(p.dynasty) ?? 0) + 1);
    }
    console.log(JSON.stringify({
      source: "gs300",
      count: poetries.length,
      dynasties: Object.fromEntries(dynastyCounts),
    }, null, 2));
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
