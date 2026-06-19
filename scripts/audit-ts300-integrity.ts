import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { db } from "@/lib/db";
import {
  findMissingIds,
  findOrphanPoetryAudioFiles,
  findStaleExplainAudioFiles,
  findStaleIds,
} from "@/lib/data/ts300-integrity";

async function loadJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function main() {
  try {
    const projectRoot = process.cwd();
    const [ts300Poetry, allPoetryWithSourceUid, imageAssets, ts300Simple, ts300Normalized, imageAssetManifest] = await Promise.all([
      db.poetry.findMany({
        where: { id: { startsWith: "ts300-" } },
        select: {
          id: true,
          sourceUid: true,
          translation: true,
          annotation: true,
          aiExplanation: true,
        },
        orderBy: { id: "asc" },
      }),
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
        where: { poetryId: { startsWith: "ts300-" } },
        select: { poetryId: true, status: true },
      }),
      loadJson<Array<{ id: string }>>(path.join(projectRoot, "data", "ts300.simple.json")),
      loadJson<Array<{ id: string; sourceUid: string }>>(path.join(projectRoot, "data", "poetries.normalized.json")),
      loadJson<Array<{ poetryId: string }>>(path.join(projectRoot, "data", "image-assets.json")),
    ]);

    const allPoetrySourceUids = allPoetryWithSourceUid
      .map((poem) => poem.sourceUid)
      .filter((sourceUid): sourceUid is string => typeof sourceUid === "string" && sourceUid.length > 0);
    const poetryIds = ts300Poetry.map((poem) => poem.id);
    const sourceUids = ts300Poetry.map((poem) => poem.sourceUid);
    const simpleUids = ts300Simple.map((poem) => poem.id);
    const normalizedIds = ts300Normalized.map((poem) => poem.id);
    const manifestTs300ImageIds = imageAssetManifest
      .map((record) => record.poetryId)
      .filter((poetryId) => poetryId.startsWith("ts300-"));

    const [poetryAudioFiles, explainAudioFiles] = await Promise.all([
      readdir(path.join(projectRoot, "public", "audio", "poetry")).catch(() => []),
      readdir(path.join(projectRoot, "public", "audio", "explain")).catch(() => []),
    ]);

    const staleExplainAudioFiles = findStaleExplainAudioFiles(
      explainAudioFiles.filter((fileName) => fileName.startsWith("ts300-")),
      poetryIds,
    );

    const orphanPoetryAudioFiles = findOrphanPoetryAudioFiles(poetryAudioFiles, allPoetrySourceUids);

    const report = {
      generatedAt: new Date().toISOString(),
      ts300Poetry: {
        total: ts300Poetry.length,
        withAnnotation: ts300Poetry.filter((poem) => poem.translation || poem.annotation).length,
        withAiExplanation: ts300Poetry.filter((poem) => poem.aiExplanation !== null).length,
      },
      sourceFiles: {
        ts300SimpleCount: ts300Simple.length,
        normalizedCount: ts300Normalized.length,
        missingFromSimpleBySourceUid: findMissingIds(sourceUids, simpleUids),
        staleInSimpleBySourceUid: findStaleIds(sourceUids, simpleUids),
        missingFromNormalizedByPoetryId: findMissingIds(poetryIds, normalizedIds),
        staleInNormalizedByPoetryId: findStaleIds(poetryIds, normalizedIds),
      },
      imageAssets: {
        databaseCount: imageAssets.length,
        readyCount: imageAssets.filter((record) => record.status === "ready").length,
        manifestTs300Count: manifestTs300ImageIds.length,
        missingFromManifestByPoetryId: findMissingIds(poetryIds, manifestTs300ImageIds),
        staleInManifestByPoetryId: findStaleIds(poetryIds, manifestTs300ImageIds),
      },
      audio: {
        poetryUuidFileCount: poetryAudioFiles.filter((fileName) => /^[0-9a-f-]{36}\.mp3$/i.test(fileName)).length,
        orphanPoetryAudioFiles,
        ts300ExplainFileCount: explainAudioFiles.filter((fileName) => fileName.startsWith("ts300-")).length,
        staleExplainAudioFiles,
      },
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await db.$disconnect();
  }
}

void main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exitCode = 1;
});
