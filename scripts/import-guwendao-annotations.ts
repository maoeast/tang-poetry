import * as cheerio from "cheerio";
import normalizedPoetries from "../data/poetries.normalized.json";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { PrismaClient } from "@prisma/client";

const BASE_URL = "https://www.guwendao.net";
const CATALOG_URL = `${BASE_URL}/gushi/tangshi.aspx`;
const REQUEST_DELAY_MS = 250;
const TITLE_ALIASES: Record<string, string[]> = {
  "山中送别": ["送别"],
  "秋夜寄邱员外": ["秋夜寄丘二十二员外"],
  "宫中词": ["宫词"],
  "近试上张水部": ["近试上张籍水部"],
  "寄扬州韩绰判官": ["寄扬州韩判官"],
  "经邹鲁祭孔子而叹之": ["经鲁祭孔子而叹之", "经邹鲁祭孔子而叹之"],
  "题破山寺后禅院": ["题破山寺后禅院后禅院"],
  "早秋": ["早秋三首 一"],
  "秋日登吴公台上寺远眺": ["秋日登吴公台上寺远眺寺即陈将吴明彻战场"],
  "送李中丞归汉阳别业": ["送李中丞之襄州"],
  "阙题": ["阙题二首 一", "阙题"],
  "望月有感": ["自河南经乱关内阻饥兄弟离散各在一处因望月有感聊书所怀寄上浮梁大兄於潜七兄乌江十五兄兼示符离及下邽弟妹"],
  "无题·凤尾香罗薄几重": ["无题"],
  "琵琶行": ["琵琶引"],
  "走马川行奉送封大夫出师": ["走马川行奉送出师西征"],
  "长信秋词五首·其三": ["相和歌辞 长信怨 二"],
  "长相思·其一": ["长相思"],
  "长相思·其二": ["长相思"],
  "金缕衣": ["杂曲歌辞 金缕衣"],
  "烈女操": ["列女操"],
  "燕歌行": ["相和歌辞 燕歌行"],
};

type CatalogEntry = {
  author: string;
  detailPath: string;
  title: string;
};

type DetailPayload = {
  ajaxId: string | null;
  author: string;
  idStr: string;
  idjm: string | null;
  lines: string[];
  title: string;
};

type TranslationAnnotation = {
  annotation: string | null;
  translation: string | null;
};

type PoetryMatchCandidate = {
  author: string;
  id: string;
  lines: string[];
  title: string;
};

type NormalizedFallbackPoetry = {
  id: string;
  sourceId: number;
  sourceUid: string;
  title: string;
  titleOriginal: string;
  titleZhHans: string;
  titleZhHant: string;
  author: string;
  authorOriginal: string;
  authorZhHans: string;
  authorZhHant: string;
  dynasty: string;
  lines: string[];
  linesZhHans: string[];
  linesZhHant: string[];
  tags: string[];
  themes: string[];
  difficulty: number;
  imageKey: string;
  imageStatus: string;
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

function normalizeText(value: string) {
  return value.replace(/\s+/g, "").trim();
}

function normalizeLineForMatch(value: string) {
  return value.replace(/[\u3001\u3002\uff0c\uff01\uff1f\uff1b\uff1a,.!?;:\s]/g, "").trim();
}

function calculateLineSimilarity(source: string, candidate: string) {
  if (!source || !candidate) {
    return 0;
  }

  const maxLength = Math.max(source.length, candidate.length);
  let sameCount = 0;

  for (let index = 0; index < Math.min(source.length, candidate.length); index += 1) {
    if (source[index] === candidate[index]) {
      sameCount += 1;
    }
  }

  return sameCount / maxLength;
}

function splitLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "zh-CN,zh;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

export function extractCatalogEntries(html: string): CatalogEntry[] {
  const $ = cheerio.load(html);
  const entries: CatalogEntry[] = [];

  $("div.typecont span").each((_index, element) => {
    const link = $(element).find('a[href^="/shiwenv_"]').first();
    const detailPath = link.attr("href")?.trim();
    const title = normalizeText(link.text());
    const text = normalizeText($(element).text());
    const authorMatch = text.match(/\(([^()]+)\)$/);
    const author = normalizeText(authorMatch?.[1] ?? "");

    if (!detailPath || !title || !author) {
      return;
    }

    entries.push({
      author,
      detailPath,
      title,
    });
  });

  return entries;
}

export function extractDetailPayload(html: string, detailPath: string): DetailPayload {
  const $ = cheerio.load(html);
  const title = normalizeText($("#sonsyuanwen h1").first().text());
  const author = normalizeText($("#sonsyuanwen p.source a").first().text());

  const linesHtml = $("#sonsyuanwen .contson").first().html() ?? "";
  const lineText = cheerio
    .load(`<div>${linesHtml.replace(/<br\s*\/?>/gi, "\n")}</div>`)("div")
    .text();
  const lines = splitLines(lineText);

  const idStrFromPath = detailPath.match(/shiwenv_([a-f0-9]+)\.aspx/i)?.[1] ?? "";
  const fanyiMatch = html.match(
    /fanyiShow\((\d+),'([^']+)','([^']+)'\)|fanyiShow\((\d+),'([^']+)'\)/,
  );

  const ajaxId = fanyiMatch?.[1] ?? fanyiMatch?.[4] ?? null;
  const idjm = fanyiMatch?.[2] ?? fanyiMatch?.[5] ?? null;
  const idStr = fanyiMatch?.[3] ?? idStrFromPath;

  if (!title || !author || lines.length === 0 || !idStr) {
    throw new Error(`Failed to extract detail payload for ${detailPath}`);
  }

  return {
    ajaxId,
    author,
    idStr,
    idjm,
    lines,
    title,
  };
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

export function parseTranslationAnnotation(html: string): TranslationAnnotation {
  const $ = cheerio.load(html);
  const blocks = $(".contyishang p");
  let translation: string | null = null;
  let annotation: string | null = null;

  blocks.each((_index, element) => {
    const cloned = $(element).clone();
    cloned.find("a").remove();
    const label = cloned.find("strong").first().text().trim();
    cloned.find("strong").remove();
    const rawHtml = cloned.html()?.replace(/<br\s*\/?>/gi, "\n") ?? "";
    const text = cheerio.load(`<div>${rawHtml}</div>`)("div").text().trim();

    if (label === "译文") {
      const value = text.trim();
      translation = value || null;
    }

    if (label === "注释") {
      const value = text.trim();
      annotation = value || null;
    }
  });

  return {
    annotation,
    translation,
  };
}

export function matchDetailToPoetry(
  detail: DetailPayload,
  candidates: PoetryMatchCandidate[],
) {
  const normalizedTitle = normalizeText(detail.title);
  const normalizedAliasTitles = (TITLE_ALIASES[detail.title] ?? []).map(normalizeText);
  const normalizedAuthor = normalizeText(detail.author);
  const normalizedLines = detail.lines.map(normalizeLineForMatch);
  const authorCandidates = candidates.filter((candidate) => {
    return normalizeText(candidate.author) === normalizedAuthor;
  });

  const exactTitleMatch = authorCandidates.find((candidate) => {
    const candidateTitle = normalizeText(candidate.title);
    return candidateTitle === normalizedTitle || normalizedAliasTitles.includes(candidateTitle);
  });

  if (exactTitleMatch) {
    return exactTitleMatch.id;
  }

  const lineMatches = authorCandidates.filter((candidate) => {
    const candidateLines = candidate.lines.map(normalizeLineForMatch);
    return candidateLines.length === normalizedLines.length
      && candidateLines.every((line, index) => line === normalizedLines[index]);
  });

  if (lineMatches.length === 1) {
    return lineMatches[0].id;
  }

  if (lineMatches.length > 1) {
    const titleContainsMatch = lineMatches.find((candidate) => {
      const candidateTitle = normalizeText(candidate.title);
      return (
        candidateTitle.includes(normalizedTitle)
        || normalizedTitle.includes(candidateTitle)
        || normalizedAliasTitles.some((alias) => candidateTitle.includes(alias) || alias.includes(candidateTitle))
      );
    });

    if (titleContainsMatch) {
      return titleContainsMatch.id;
    }
  }

  const fuzzyMatches = authorCandidates
    .map((candidate) => {
      const candidateLines = candidate.lines.map(normalizeLineForMatch);
      if (candidateLines.length !== normalizedLines.length) {
        return {
          candidate,
          score: 0,
        };
      }

      const scores = candidateLines.map((line, index) => {
        return calculateLineSimilarity(normalizedLines[index] ?? "", line);
      });

      return {
        candidate,
        score: scores.reduce((sum, value) => sum + value, 0) / scores.length,
      };
    })
    .filter((item) => item.score >= 0.8)
    .sort((left, right) => right.score - left.score);

  if (fuzzyMatches.length > 0) {
    return fuzzyMatches[0].candidate.id;
  }

  return null;
}

export function findNormalizedFallbackPoetry(
  detail: DetailPayload,
  candidates: NormalizedFallbackPoetry[],
) {
  const normalizedAuthor = normalizeText(detail.author);
  const normalizedTitle = normalizeText(detail.title);
  const normalizedAliasTitles = (TITLE_ALIASES[detail.title] ?? []).map(normalizeText);
  const normalizedLines = detail.lines.map(normalizeLineForMatch);

  const authorCandidates = candidates.filter((candidate) => {
    return normalizeText(candidate.author) === normalizedAuthor;
  });

  const exactTitleMatch = authorCandidates.find((candidate) => {
    const candidateTitle = normalizeText(candidate.title);
    return candidateTitle === normalizedTitle || normalizedAliasTitles.includes(candidateTitle);
  });

  if (exactTitleMatch) {
    return exactTitleMatch;
  }

  const lineMatches = authorCandidates.filter((candidate) => {
    const candidateLines = candidate.lines.map(normalizeLineForMatch);
    return candidateLines.length === normalizedLines.length
      && candidateLines.every((line, index) => line === normalizedLines[index]);
  });

  if (lineMatches.length === 1) {
    return lineMatches[0];
  }

  if (lineMatches.length > 1) {
    const titleContainsMatch = lineMatches.find((candidate) => {
      const candidateTitle = normalizeText(candidate.title);
      return (
        candidateTitle.includes(normalizedTitle)
        || normalizedTitle.includes(candidateTitle)
        || normalizedAliasTitles.some((alias) => candidateTitle.includes(alias) || alias.includes(candidateTitle))
      );
    });

    if (titleContainsMatch) {
      return titleContainsMatch;
    }
  }

  const fuzzyMatches = authorCandidates
    .map((candidate) => {
      const candidateLines = candidate.lines.map(normalizeLineForMatch);
      if (candidateLines.length !== normalizedLines.length) {
        return {
          candidate,
          score: 0,
        };
      }

      const scores = candidateLines.map((line, index) => {
        return calculateLineSimilarity(normalizedLines[index] ?? "", line);
      });

      return {
        candidate,
        score: scores.reduce((sum, value) => sum + value, 0) / scores.length,
      };
    })
    .filter((item) => item.score >= 0.8)
    .sort((left, right) => right.score - left.score);

  if (fuzzyMatches.length > 0) {
    return fuzzyMatches[0].candidate;
  }

  return null;
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
  const html = await fetchHtml(ajaxUrl);
  return parseTranslationAnnotation(html);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runImportGuwendaoAnnotations(): Promise<ImportResult> {
  const catalogHtml = await fetchHtml(CATALOG_URL);
  const catalogEntries = extractCatalogEntries(catalogHtml);

  const poetries = await db.poetry.findMany({
    select: {
      id: true,
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
    title: poetry.title,
  }));

  const normalizedFallbackCandidates = (normalizedPoetries as NormalizedFallbackPoetry[]).filter(
    (poetry) => Array.isArray(poetry.tags) && poetry.tags.includes("唐诗三百首"),
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
      detail.ajaxId && detail.idjm ? await fetchAjaxTranslation(detail) : inlineContent;
    const translation = remoteContent.translation ?? inlineContent.translation;
    const annotation = remoteContent.annotation ?? inlineContent.annotation;

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
    const result = await runImportGuwendaoAnnotations();
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
