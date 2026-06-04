/**
 * Generate pinyin for all poems in the database.
 *
 * Reads poems from DB, generates space-separated pinyin syllables for each line
 * (CJK characters only — punctuation is skipped by renderRubyText at render time),
 * then writes the pinyin array back to the Poetry.pinyin column.
 *
 * Usage:
 *   npx tsx scripts/generate-pinyin.ts          # dry run (print stats)
 *   npx tsx scripts/generate-pinyin.ts --write   # write to DB
 */
import { PrismaClient } from "@prisma/client";
import { pinyin as pinyinFn } from "pinyin-pro";

const prisma = new PrismaClient();

const CJK_REGEX = /[一-鿿㐀-䶿]/u;

/**
 * Generate a space-separated pinyin string for the CJK characters in a line.
 * Non-CJK characters (punctuation, spaces) are skipped so that
 * renderRubyText() can pair syllables 1:1 with CJK chars.
 */
function lineToPinyin(line: string): string {
  const chars = [...line];
  const cjkChars = chars.filter((ch) => CJK_REGEX.test(ch));

  if (cjkChars.length === 0) return "";

  // pinyin-pro returns one syllable per character in the input string
  const syllables = pinyinFn(cjkChars.join(""), {
    toneType: "symbol", // 带声调符号: xī lù chán
    type: "array",
  });

  return syllables.join(" ");
}

async function main() {
  const shouldWrite = process.argv.includes("--write");

  console.log(
    shouldWrite
      ? "🔄 Generating pinyin and writing to DB..."
      : "📋 Dry run — use --write to persist changes",
  );

  const poems = await prisma.poetry.findMany({
    select: {
      id: true,
      linesZhHans: true,
      pinyin: true,
    },
  });

  console.log(`Found ${poems.length} poems`);

  let updated = 0;
  let skipped = 0;
  let empty = 0;

  for (const poem of poems) {
    const lines = Array.isArray(poem.linesZhHans)
      ? poem.linesZhHans.filter((l: unknown) => typeof l === "string")
      : [];

    if (lines.length === 0) {
      empty++;
      continue;
    }

    // Skip poems that already have pinyin with correct length
    const existingPinyin = Array.isArray(poem.pinyin)
      ? (poem.pinyin as unknown[])
      : [];
    if (
      existingPinyin.length === lines.length &&
      existingPinyin.every((p) => typeof p === "string" && p.length > 0)
    ) {
      skipped++;
      continue;
    }

    const pinyinLines = lines.map((line: string) => lineToPinyin(line));

    if (shouldWrite) {
      await prisma.poetry.update({
        where: { id: poem.id },
        data: { pinyin: pinyinLines },
      });
    }

    updated++;
  }

  console.log("\n📊 Results:");
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (already have pinyin): ${skipped}`);
  console.log(`  Empty (no lines): ${empty}`);

  if (!shouldWrite && updated > 0) {
    console.log(
      "\n💡 Run with --write to persist these changes to the database.",
    );
  }
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
