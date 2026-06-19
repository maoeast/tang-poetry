import { readdir } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const projectRoot = process.cwd();

  try {
    const poems = await prisma.poetry.findMany({
      select: {
        id: true,
        aiExplanation: true,
      },
      orderBy: { id: "asc" },
    });

    const files = await readdir(path.join(projectRoot, "public", "audio", "explain")).catch(
      () => [],
    );

    const validPoetryIds = new Set(poems.map((poem) => poem.id));
    const cachePairs = new Set<string>();

    for (const poem of poems) {
      const keys =
        poem.aiExplanation && typeof poem.aiExplanation === "object" && !Array.isArray(poem.aiExplanation)
          ? Object.keys(poem.aiExplanation)
          : [];

      for (const key of keys) {
        const match = key.match(/^(child|general)_v\d+$/);
        if (!match) {
          continue;
        }

        cachePairs.add(`${poem.id}_${match[1]}.mp3`);
      }
    }

    const explainFiles = files.filter((fileName) => /_(child|general)\.mp3$/i.test(fileName));
    const stalePoetryIdFiles = explainFiles.filter((fileName) => {
      const poetryId = fileName.replace(/_(child|general)\.mp3$/i, "");
      return !validPoetryIds.has(poetryId);
    });
    const filesWithoutDbCache = explainFiles.filter((fileName) => !cachePairs.has(fileName));
    const missingAudioForDbCache = [...cachePairs].filter((fileName) => !explainFiles.includes(fileName));

    console.log(
      JSON.stringify(
        {
          explainAudioFiles: explainFiles.length,
          cachePairs: cachePairs.size,
          stalePoetryIdFiles,
          filesWithoutDbCache,
          missingAudioForDbCache,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
