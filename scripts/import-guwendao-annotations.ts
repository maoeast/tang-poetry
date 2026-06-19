import * as cheerio from "cheerio";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { PrismaClient } from "@prisma/client";
import normalizedPoetries from "../data/poetries.normalized.json";

import {
  extractCatalogEntries,
  extractDetailPayload,
  findNormalizedFallbackPoetry,
  matchDetailToPoetry,
  parseTranslationAnnotation,
  type DetailPayload,
  type NormalizedFallbackPoetry,
  type PoetryMatchCandidate,
} from "@/lib/poetry/guwendao-annotation-import";

const BASE_URL = "https://www.guwendao.net";
const CATALOG_URLS = {
  gs300: `${BASE_URL}/gushi/sanbai.aspx`,
  sc200: `${BASE_URL}/gushi/songci.aspx`,
  ts300: `${BASE_URL}/gushi/tangshi.aspx`,
} as const;
const REQUEST_DELAY_MS = 250;
const execFileAsync = promisify(execFile);

type TranslationAnnotation = {
  annotation: string | null;
  translation: string | null;
};

type ImportResult = {
  catalogCount: number;
  matchedCount: number;
  updatedCount: number;
  unmatched: Array<{
    author: string;
    detailPath: string;
    title: string;
  }>;
};

const db = new PrismaClient({ log: ["error", "warn"] });


async function fetchHtml(url: string) {
  const { stdout } = await execFileAsync(
    "curl",
    [
      "-fsSL",
      "--max-time",
      "45",
      "-H",
      "Accept: text/html,application/xhtml+xml",
      "-H",
      "Accept-Language: zh-CN,zh;q=0.9",
      "-H",
      "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      url,
    ],
    {
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  return stdout;
}

function extractInlineTranslationAnnotation(html: string): TranslationAnnotation {
  const $ = cheerio.load(html);
  const section = $(".sons").filter((_index, element) => {
    const heading = $(element).find("h2 span").first().text().trim();
    return heading === "译文及注释";
  }).first();

  if (section.length === 0) {
    return {
      annotation: null,
      translation: null,
    };
  }

  return parseTranslationAnnotation(section.html() ?? "");
}

async function fetchAjaxTranslation(detail: DetailPayload) {
  if (!detail.ajaxId || !detail.idjm) {
    return {
      annotation: null,
      translation: null,
    };
  }

  const ajaxUrl =
    `${BASE_URL}/nocdn/ajaxfanyi.aspx?id=${detail.ajaxId}&idjm=${detail.idjm}&idStr=${detail.idStr}`;
  try {
    const html = await fetchHtml(ajaxUrl);
    return parseTranslationAnnotation(html);
  } catch {
    return {
      annotation: null,
      translation: null,
    };
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runImportGuwendaoAnnotations(
  source: keyof typeof CATALOG_URLS = "ts300",
): Promise<ImportResult> {
  const catalogHtml = await fetchHtml(CATALOG_URLS[source]);
  const catalogEntries = extractCatalogEntries(catalogHtml);

  const poetries = await db.poetry.findMany({
    select: {
      id: true,
      sourceUid: true,
      title: true,
      author: true,
      lines: true,
    },
  });

  const matchCandidates: PoetryMatchCandidate[] = poetries.map((poetry) => ({
    author: poetry.author,
    id: poetry.id,
    lines: Array.isArray(poetry.lines)
      ? poetry.lines.filter((line): line is string => typeof line === "string")
      : [],
    sourceUid: poetry.sourceUid,
    title: poetry.title,
  }));

  const normalizedFallbackCandidates = (normalizedPoetries as NormalizedFallbackPoetry[]).filter(
    (poetry) =>
      Array.isArray(poetry.tags)
      && (
        (source === "ts300" && poetry.tags.includes("唐诗三百首"))
        || (source === "gs300" && poetry.tags.includes("古诗三百"))
        || (source === "sc200" && poetry.tags.includes("宋词精选"))
      ),
  );

  let matchedCount = 0;
  let updatedCount = 0;
  const unmatched: ImportResult["unmatched"] = [];

  for (const entry of catalogEntries) {
    const detailHtml = await fetchHtml(new URL(entry.detailPath, BASE_URL).toString());
    const detail = extractDetailPayload(detailHtml, entry.detailPath);
    let poetryId = matchDetailToPoetry(detail, matchCandidates);

    if (!poetryId) {
      const fallback = findNormalizedFallbackPoetry(detail, normalizedFallbackCandidates);

      if (fallback) {
        await db.poetry.upsert({
          where: { id: fallback.id },
          create: {
            id: fallback.id,
            sourceId: fallback.sourceId,
            sourceUid: fallback.sourceUid,
            title: fallback.title,
            titleOriginal: fallback.titleOriginal,
            titleZhHans: fallback.titleZhHans,
            titleZhHant: fallback.titleZhHant,
            author: fallback.author,
            authorOriginal: fallback.authorOriginal,
            authorZhHans: fallback.authorZhHans,
            authorZhHant: fallback.authorZhHant,
            dynasty: fallback.dynasty,
            lines: fallback.lines,
            linesZhHans: fallback.linesZhHans,
            linesZhHant: fallback.linesZhHant,
            tags: fallback.tags,
            themes: fallback.themes,
            difficulty: fallback.difficulty,
            imageKey: fallback.imageKey,
            imageStatus: fallback.imageStatus,
          },
          update: {
            sourceId: fallback.sourceId,
            sourceUid: fallback.sourceUid,
            title: fallback.title,
            titleOriginal: fallback.titleOriginal,
            titleZhHans: fallback.titleZhHans,
            titleZhHant: fallback.titleZhHant,
            author: fallback.author,
            authorOriginal: fallback.authorOriginal,
            authorZhHans: fallback.authorZhHans,
            authorZhHant: fallback.authorZhHant,
            dynasty: fallback.dynasty,
            lines: fallback.lines,
            linesZhHans: fallback.linesZhHans,
            linesZhHant: fallback.linesZhHant,
            tags: fallback.tags,
            themes: fallback.themes,
            difficulty: fallback.difficulty,
            imageKey: fallback.imageKey,
            imageStatus: fallback.imageStatus,
          },
        });

        poetryId = fallback.id;
        matchCandidates.push({
          author: fallback.author,
          id: fallback.id,
          lines: fallback.lines,
          sourceUid: fallback.sourceUid,
          title: fallback.title,
        });
      }
    }

    if (!poetryId) {
      unmatched.push(entry);
      await delay(REQUEST_DELAY_MS);
      continue;
    }

    matchedCount += 1;

    const inlineContent = extractInlineTranslationAnnotation(detailHtml);
    const remoteContent =
      !inlineContent.translation && !inlineContent.annotation && detail.ajaxId && detail.idjm
        ? await fetchAjaxTranslation(detail)
        : { annotation: null, translation: null };
    const translation = inlineContent.translation ?? remoteContent.translation;
    const annotation = inlineContent.annotation ?? remoteContent.annotation;

    await db.poetry.update({
      where: { id: poetryId },
      data: {
        translation,
        annotation,
      },
    });

    updatedCount += 1;
    await delay(REQUEST_DELAY_MS);
  }

  return {
    catalogCount: catalogEntries.length,
    matchedCount,
    updatedCount,
    unmatched,
  };
}

async function main() {
  try {
    const sourceArg = (process.argv[2] as keyof typeof CATALOG_URLS | undefined) ?? "ts300";
    if (!(sourceArg in CATALOG_URLS)) {
      throw new Error(`Unsupported source: ${sourceArg}`);
    }

    const result = await runImportGuwendaoAnnotations(sourceArg);
    console.log(JSON.stringify(result, null, 2));
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
