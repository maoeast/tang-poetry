// Restore DB-only poetry content from data/poetry-annotations.json.
//
// Safety: never overwrites existing DB values. Only fills fields that are
// currently null/empty in DB. Run after a fresh DB import to recover
// translation/annotation/aiExplanation without re-calling DeepSeek.
import { readFile } from "node:fs/promises";
import path from "node:path";

import { db } from "@/lib/db";

type AnnotationEntry = {
  translation?: string;
  annotation?: string;
  aiExplanation?: unknown;
};

const INPUT_PATH = path.resolve(process.cwd(), "data", "poetry-annotations.json");

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  let payload: Record<string, AnnotationEntry>;
  try {
    const text = await readFile(INPUT_PATH, "utf8");
    payload = JSON.parse(text);
  } catch (e) {
    console.error(`Failed to read ${INPUT_PATH}: ${(e as Error).message}`);
    process.exitCode = 1;
    return;
  }

  const ids = Object.keys(payload);
  console.log(`Source: ${path.relative(process.cwd(), INPUT_PATH)} (${ids.length} entries)`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "APPLY"}`);
  console.log("");

  const existing = await db.poetry.findMany({
    where: { id: { in: ids } },
    select: { id: true, translation: true, annotation: true, aiExplanation: true },
  });
  const dbMap = new Map(existing.map((p) => [p.id, p]));

  let filledTranslation = 0;
  let filledAnnotation = 0;
  let filledAiExplanation = 0;
  let missingInDb = 0;
  let alreadyComplete = 0;

  for (const id of ids.sort()) {
    const entry = payload[id];
    const dbRow = dbMap.get(id);
    if (!dbRow) {
      missingInDb += 1;
      continue;
    }

    const updates: {
      translation?: string;
      annotation?: string;
      aiExplanation?: unknown;
    } = {};

    if (
      !dbRow.translation?.trim() &&
      typeof entry.translation === "string" &&
      entry.translation.trim()
    ) {
      updates.translation = entry.translation;
      filledTranslation += 1;
    }

    if (
      !dbRow.annotation?.trim() &&
      typeof entry.annotation === "string" &&
      entry.annotation.trim()
    ) {
      updates.annotation = entry.annotation;
      filledAnnotation += 1;
    }

    if (
      dbRow.aiExplanation == null &&
      entry.aiExplanation != null &&
      typeof entry.aiExplanation === "object" &&
      Object.keys(entry.aiExplanation as object).length > 0
    ) {
      updates.aiExplanation = entry.aiExplanation;
      filledAiExplanation += 1;
    }

    if (Object.keys(updates).length === 0) {
      alreadyComplete += 1;
      continue;
    }

    if (dryRun) {
      console.log(
        `[would-fill] ${id} T:${"translation" in updates ? "+" : "-"} A:${"annotation" in updates ? "+" : "-"} AI:${"aiExplanation" in updates ? "+" : "-"}`,
      );
    } else {
      await db.poetry.update({ where: { id }, data: updates });
      console.log(
        `[filled] ${id} T:${"translation" in updates ? "+" : "-"} A:${"annotation" in updates ? "+" : "-"} AI:${"aiExplanation" in updates ? "+" : "-"}`,
      );
    }
  }

  console.log("");
  console.log(
    `Done. Filled: T=${filledTranslation} A=${filledAnnotation} AI=${filledAiExplanation} | already-complete=${alreadyComplete} | missing-in-db=${missingInDb}`,
  );
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
