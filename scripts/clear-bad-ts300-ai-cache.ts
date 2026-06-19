import { rm } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { removeExplanationAudiences } from "@/lib/ai/cache-maintenance";
import type { ExplanationAudience } from "@/lib/ai/prompts";

const prisma = new PrismaClient();

const BAD_CACHE_TARGETS: Array<{
  id: string;
  reason: string;
  audiences: ExplanationAudience[];
}> = [
  {
    id: "ts300-0004",
    reason: "AI summary matches 李白《将进酒》 rather than 王昌龄《出塞 一》",
    audiences: ["child"],
  },
  {
    id: "ts300-0014",
    reason: "AI summary matches 李商隐《韩碑》 rather than 李商隐《隋宫》",
    audiences: ["child"],
  },
  {
    id: "ts300-0203",
    reason: "AI summary describes rural exile life rather than 杜甫《客至》",
    audiences: ["child"],
  },
  {
    id: "ts300-0204",
    reason: "AI summary matches 柳宗元《江雪》 rather than 杜甫《野望》",
    audiences: ["child", "general"],
  },
  {
    id: "ts300-0213",
    reason: "AI summary matches 杜甫《蜀相》 rather than 杜甫《八阵图》",
    audiences: ["child", "general"],
  },
];

function buildExplainAudioPath(projectRoot: string, poetryId: string, audience: ExplanationAudience) {
  return path.join(projectRoot, "public", "audio", "explain", `${poetryId}_${audience}.mp3`);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const projectRoot = process.cwd();

  try {
    const rows = await prisma.poetry.findMany({
      where: {
        id: {
          in: BAD_CACHE_TARGETS.map((target) => target.id),
        },
      },
      select: {
        id: true,
        title: true,
        author: true,
        aiExplanation: true,
      },
      orderBy: { id: "asc" },
    });

    const targetMap = new Map(BAD_CACHE_TARGETS.map((target) => [target.id, target]));
    const updates = rows
      .map((row) => {
        const target = targetMap.get(row.id);
        if (!target) {
          return null;
        }

        return {
          ...row,
          audiences: target.audiences,
          reason: target.reason,
          nextCache: removeExplanationAudiences(row.aiExplanation, target.audiences),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (dryRun) {
      console.log(
        JSON.stringify(
          {
            dryRun: true,
            targets: updates.map((row) => ({
              id: row.id,
              title: row.title,
              author: row.author,
              audiences: row.audiences,
              reason: row.reason,
              nextCacheKeys: row.nextCache ? Object.keys(row.nextCache) : [],
            })),
          },
          null,
          2,
        ),
      );
      return;
    }

    for (const row of updates) {
      await prisma.poetry.update({
        where: { id: row.id },
        data: { aiExplanation: row.nextCache },
      });

      for (const audience of ["child", "general"] as const) {
        await rm(buildExplainAudioPath(projectRoot, row.id, audience), { force: true });
      }
    }

    console.log(
      JSON.stringify(
        {
          dryRun: false,
          updatedPoems: updates.map((row) => ({
            id: row.id,
            removedAudiences: row.audiences,
            remainingCacheKeys: row.nextCache ? Object.keys(row.nextCache) : [],
          })),
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
