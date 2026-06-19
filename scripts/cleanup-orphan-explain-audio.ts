import { readdir, rm } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const projectRoot = process.cwd();
  const explainDir = path.join(projectRoot, "public", "audio", "explain");

  try {
    const poems = await prisma.poetry.findMany({
      select: {
        id: true,
        aiExplanation: true,
      },
      orderBy: { id: "asc" },
    });

    const files = await readdir(explainDir).catch(() => []);
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
    const filesWithoutDbCache = explainFiles.filter((fileName) => !cachePairs.has(fileName));

    if (dryRun) {
      console.log(
        JSON.stringify(
          {
            dryRun: true,
            totalExplainFiles: explainFiles.length,
            cachePairs: cachePairs.size,
            filesToDelete: filesWithoutDbCache.length,
            sample: filesWithoutDbCache.slice(0, 40),
          },
          null,
          2,
        ),
      );
      return;
    }

    for (const fileName of filesWithoutDbCache) {
      await rm(path.join(explainDir, fileName), { force: true });
    }

    console.log(
      JSON.stringify(
        {
          dryRun: false,
          deleted: filesWithoutDbCache.length,
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
