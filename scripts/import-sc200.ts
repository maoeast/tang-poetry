import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import OpenCC from "opencc-js";

import { db } from "@/lib/db";
import {
  normalizeSingleSourcePoems,
  type RawPoem,
} from "@/lib/poetry/normalize";
import { writeImportPayloadToDb } from "@/scripts/import-ts300";

const DATA_DIR = path.join(process.cwd(), "data");
const SC200_FILE = path.join(DATA_DIR, "sc200.simple.json");

const convertToTraditional = OpenCC.Converter({ from: "cn", to: "tw" });

async function main() {
  try {
    const raw = await readFile(SC200_FILE, "utf8");
    const poems = JSON.parse(raw) as RawPoem[];

    console.error(`Loaded ${poems.length} sc200 poems`);

    const poetries = normalizeSingleSourcePoems(poems, {
      idPrefix: "sc200",
      dynastyMap: () => "宋",
      convertToTraditional: convertToTraditional as (text: string) => string,
    });

    console.error(`Normalized ${poetries.length} poems`);

    await writeImportPayloadToDb({ poetries, dailySeeds: [] });

    console.log(JSON.stringify({
      source: "sc200",
      count: poetries.length,
      dynasty: "宋",
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
