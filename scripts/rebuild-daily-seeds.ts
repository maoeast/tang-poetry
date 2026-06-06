import path from "node:path";
import { pathToFileURL } from "node:url";

import { db } from "@/lib/db";
import { buildInterleavedDailySeeds } from "@/lib/poetry/daily-seed";

async function main() {
  try {
    const [ts300, gs300, sc200] = await Promise.all([
      db.poetry.findMany({
        where: { id: { startsWith: "ts300-" } },
        select: { id: true },
        orderBy: { id: "asc" },
      }),
      db.poetry.findMany({
        where: { id: { startsWith: "gs300-" } },
        select: { id: true },
        orderBy: { id: "asc" },
      }),
      db.poetry.findMany({
        where: { id: { startsWith: "sc200-" } },
        select: { id: true },
        orderBy: { id: "asc" },
      }),
    ]);

    const seeds = buildInterleavedDailySeeds([
      { source: "ts300", poetryIds: ts300.map((p) => p.id) },
      { source: "gs300", poetryIds: gs300.map((p) => p.id) },
      { source: "sc200", poetryIds: sc200.map((p) => p.id) },
    ]);

    console.error(
      `Building ${seeds.length} daily seeds from ${ts300.length} + ${gs300.length} + ${sc200.length} poems`,
    );

    await db.$transaction(
      seeds.map((seed) =>
        db.dailyPoetry.upsert({
          where: { date: seed.date },
          create: seed,
          update: { poetryId: seed.poetryId },
        }),
      ),
    );

    console.log(JSON.stringify({
      totalDays: seeds.length,
      sources: {
        ts300: ts300.length,
        gs300: gs300.length,
        sc200: sc200.length,
      },
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
