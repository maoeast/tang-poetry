// Dump DB-only poetry content (translation, annotation, aiExplanation) to a JSON
// file so it survives DB crashes. Restorable via restore-annotations.ts.
//
// Schema: { [poetryId]: { translation?, annotation?, aiExplanation? } }
// Entries with no DB-only content are omitted to keep the file small.
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { db } from "@/lib/db";

type AnnotationEntry = {
  translation?: string;
  annotation?: string;
  aiExplanation?: unknown;
};

const OUTPUT_PATH = path.resolve(process.cwd(), "data", "poetry-annotations.json");

async function main() {
  const poems = await db.poetry.findMany({
    select: { id: true, translation: true, annotation: true, aiExplanation: true },
    orderBy: { id: "asc" },
  });

  const out: Record<string, AnnotationEntry> = {};
  let included = 0;
  let skipped = 0;

  for (const p of poems) {
    const entry: AnnotationEntry = {};
    if (typeof p.translation === "string" && p.translation.trim()) {
      entry.translation = p.translation;
    }
    if (typeof p.annotation === "string" && p.annotation.trim()) {
      entry.annotation = p.annotation;
    }
    // aiExplanation is Json? — keep as-is when present and non-empty.
    if (p.aiExplanation != null && typeof p.aiExplanation === "object") {
      const keys = Object.keys(p.aiExplanation);
      if (keys.length > 0) {
        entry.aiExplanation = p.aiExplanation;
      }
    }

    if (Object.keys(entry).length === 0) {
      skipped += 1;
      continue;
    }
    out[p.id] = entry;
    included += 1;
  }

  const sorted: Record<string, AnnotationEntry> = {};
  for (const key of Object.keys(out).sort()) {
    sorted[key] = out[key];
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");

  const fileSize = Buffer.byteLength(JSON.stringify(sorted), "utf8");
  const sizeKB = Math.round(fileSize / 1024);
  console.log(
    `Dumped ${included} poems → ${path.relative(process.cwd(), OUTPUT_PATH)} (${sizeKB} KB, ${skipped} empty skipped, ${poems.length} total in DB)`,
  );
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
