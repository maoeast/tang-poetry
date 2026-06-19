import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { db } from "@/lib/db";
import {
  buildTs300NormalizedPoems,
  buildTs300RawPoems,
  buildTs300SimplePoems,
  findOrphanPoetryAudioFiles,
  findStaleExplainAudioFiles,
  type Ts300ExportRecord,
} from "@/lib/data/ts300-integrity";

type ImageAssetManifestRecord = {
  poetryId: string;
  style: string;
  status: string;
  promptVersion: string;
  imagePath: string;
  thumbPath: string | null;
};

async function writeJsonFile(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const projectRoot = process.cwd();

  try {
    const [ts300Poetry, allPoetryWithSourceUid, imageAssets, poetryAudioFiles, explainAudioFiles] = await Promise.all([
      db.poetry.findMany({
        where: { id: { startsWith: "ts300-" } },
        select: {
          id: true,
          sourceId: true,
          sourceUid: true,
          title: true,
          titleOriginal: true,
          titleZhHans: true,
          titleZhHant: true,
          author: true,
          authorOriginal: true,
          authorZhHans: true,
          authorZhHant: true,
          dynasty: true,
          lines: true,
          linesZhHans: true,
          linesZhHant: true,
          tags: true,
          themes: true,
          difficulty: true,
          imageKey: true,
          imageStatus: true,
          translation: true,
          annotation: true,
          pinyin: true,
          aiExplanation: true,
        },
        orderBy: { id: "asc" },
      }) as Promise<Ts300ExportRecord[]>,
      db.poetry.findMany({
        select: {
          sourceUid: true,
        },
        where: {
          sourceUid: {
            not: null,
          },
        },
      }),
      db.imageAsset.findMany({
        select: {
          poetryId: true,
          style: true,
          status: true,
          promptVersion: true,
          imagePath: true,
          thumbPath: true,
        },
        orderBy: [{ poetryId: "asc" }, { style: "asc" }, { promptVersion: "asc" }],
      }) as Promise<ImageAssetManifestRecord[]>,
      readdir(path.join(projectRoot, "public", "audio", "poetry")).catch(() => []),
      readdir(path.join(projectRoot, "public", "audio", "explain")).catch(() => []),
    ]);

    const simplePoems = buildTs300SimplePoems(ts300Poetry);
    const rawPoems = buildTs300RawPoems(ts300Poetry);
    const normalizedPoems = buildTs300NormalizedPoems(ts300Poetry);
    const sourceUids = ts300Poetry.map((poem) => poem.sourceUid);
    const allSourceUids = allPoetryWithSourceUid.map((poem) => poem.sourceUid);
    const poetryIds = ts300Poetry.map((poem) => poem.id);

    const staleExplainAudioFiles = findStaleExplainAudioFiles(
      explainAudioFiles.filter((fileName) => fileName.startsWith("ts300-")),
      poetryIds,
    );
    const orphanPoetryAudioFiles = findOrphanPoetryAudioFiles(poetryAudioFiles, allSourceUids);

    const summary = {
      dryRun,
      filesToWrite: {
        ts300Simple: simplePoems.length,
        ts300Raw: rawPoems.length,
        ts300Normalized: normalizedPoems.length,
        imageAssets: imageAssets.length,
      },
      filesToDelete: {
        staleExplainAudioFiles: staleExplainAudioFiles.length,
        orphanPoetryAudioFiles: orphanPoetryAudioFiles.length,
      },
    };

    if (dryRun) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    await Promise.all([
      writeJsonFile(path.join(projectRoot, "data", "ts300.simple.json"), simplePoems),
      writeJsonFile(path.join(projectRoot, "data", "ts300.raw.json"), rawPoems),
      writeJsonFile(path.join(projectRoot, "data", "poetries.normalized.json"), normalizedPoems),
      writeJsonFile(path.join(projectRoot, "data", "image-assets.json"), imageAssets),
    ]);

    await Promise.all([
      ...staleExplainAudioFiles.map((fileName) =>
        rm(path.join(projectRoot, "public", "audio", "explain", fileName), { force: true }),
      ),
      ...orphanPoetryAudioFiles.map((fileName) =>
        rm(path.join(projectRoot, "public", "audio", "poetry", fileName), { force: true }),
      ),
    ]);

    const postImageAssets = JSON.parse(
      await readFile(path.join(projectRoot, "data", "image-assets.json"), "utf8"),
    ) as ImageAssetManifestRecord[];

    console.log(
      JSON.stringify(
        {
          ...summary,
          imageAssetsWritten: postImageAssets.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}

void main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exitCode = 1;
});
