import * as cheerio from "cheerio";
import { execFile } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { PrismaClient } from "@prisma/client";

import {
  extractDetailPayload,
  matchDetailToPoetry,
  normalizeText,
  parseTranslationAnnotation,
  type CatalogEntry,
  type DetailPayload,
  type PoetryMatchCandidate,
} from "@/lib/poetry/guwendao-annotation-import";
import * as cheerioForCatalog from "cheerio";

const BASE_URL = "https://www.guwendao.net";
const CATALOGS: Record<string, string> = {
  // Elementary school anthology — covers most of the 36 added children's poems.
  xiaoxue: `${BASE_URL}/gushi/xiaoxue.aspx`,
  // Classic 320 — re-crawl to catch the ~12 scattered poems whose first match failed.
  tangshi: `${BASE_URL}/gushi/tangshi.aspx`,
};
const REQUEST_DELAY_MS = 250;
const execFileAsync = promisify(execFile);

type TranslationAnnotation = {
  annotation: string | null;
  translation: string | null;
};

type FillResult = {
  catalogName: string;
  catalogCount: number;
  candidatesCount: number;
  matchedCount: number;
  updatedCount: number;
  skippedHasTranslation: number;
  noContent: Array<{ detailPath: string; title: string; author: string }>;
  unmatched: Array<{ detailPath: string; title: string; author: string }>;
};

const db = new PrismaClient({ log: ["error", "warn"] });

async function fetchHtml(url: string): Promise<string> {
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
    { maxBuffer: 10 * 1024 * 1024 },
  );
  return stdout;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Lenient variant of extractCatalogEntries that does NOT skip spans lacking
// a parenthetical author — the tangshi catalog has many such entries and the
// detail page itself carries the authoritative author.
function extractCatalogEntriesLenient(html: string): CatalogEntry[] {
  const $ = cheerioForCatalog.load(html);
  const entries: CatalogEntry[] = [];
  $("div.typecont span").each((_i, el) => {
    const link = $(el).find('a[href^="/shiwenv_"]').first();
    const detailPath = link.attr("href")?.trim();
    const title = normalizeText(link.text());
    if (!detailPath || !title) return;
    const text = normalizeText($(el).text());
    const authorMatch = text.match(/\(([^()]+)\)$/);
    entries.push({
      author: normalizeText(authorMatch?.[1] ?? ""),
      detailPath,
      title,
    });
  });
  return entries;
}

function extractInlineTranslationAnnotation(html: string): TranslationAnnotation {
  // Mobile pages embed the 译文及注释 block inside a .sons section.
  const $ = cheerio.load(html);
  const section = $(".sons")
    .filter((_i, el) => $(el).find("h2 span").first().text().trim() === "译文及注释")
    .first();

  if (section.length === 0) {
    return { annotation: null, translation: null };
  }
  return parseTranslationAnnotation(section.html() ?? "");
}

async function fetchAjaxTranslation(detail: DetailPayload): Promise<TranslationAnnotation> {
  if (!detail.ajaxId || !detail.idjm) {
    return { annotation: null, translation: null };
  }
  const url = `${BASE_URL}/nocdn/ajaxfanyi.aspx?id=${detail.ajaxId}&idjm=${detail.idjm}&idStr=${detail.idStr}`;
  try {
    return parseTranslationAnnotation(await fetchHtml(url));
  } catch {
    return { annotation: null, translation: null };
  }
}

async function processCatalog(
  catalogName: string,
  catalogUrl: string,
  candidates: PoetryMatchCandidate[],
  missingIds: Set<string>,
): Promise<FillResult> {
  const result: FillResult = {
    catalogName,
    catalogCount: 0,
    candidatesCount: candidates.length,
    matchedCount: 0,
    updatedCount: 0,
    skippedHasTranslation: 0,
    noContent: [],
    unmatched: [],
  };

  let catalogEntries: CatalogEntry[] = [];
  try {
    const html = await fetchHtml(catalogUrl);
    catalogEntries = extractCatalogEntriesLenient(html);
  } catch (e) {
    console.error(`[${catalogName}] failed to fetch catalog: ${(e as Error).message}`);
    return result;
  }
  result.catalogCount = catalogEntries.length;
  console.log(`[${catalogName}] catalog entries: ${catalogEntries.length}`);

  for (const entry of catalogEntries) {
    let detailHtml: string;
    try {
      detailHtml = await fetchHtml(new URL(entry.detailPath, BASE_URL).toString());
    } catch (e) {
      console.error(`  [fetch-fail] ${entry.title} (${entry.author}): ${(e as Error).message}`);
      result.unmatched.push(entry);
      await delay(REQUEST_DELAY_MS);
      continue;
    }

    let detail: DetailPayload;
    try {
      detail = extractDetailPayload(detailHtml, entry.detailPath);
    } catch {
      result.unmatched.push(entry);
      await delay(REQUEST_DELAY_MS);
      continue;
    }

    const poetryId = matchDetailToPoetry(detail, candidates);
    if (!poetryId) {
      result.unmatched.push(entry);
      await delay(REQUEST_DELAY_MS);
      continue;
    }
    result.matchedCount += 1;

    // Only fill poems that are still missing translation.
    if (!missingIds.has(poetryId)) {
      result.skippedHasTranslation += 1;
      await delay(REQUEST_DELAY_MS);
      continue;
    }

    let content = extractInlineTranslationAnnotation(detailHtml);
    if (!content.translation && !content.annotation) {
      const ajax = await fetchAjaxTranslation(detail);
      content = {
        translation: content.translation ?? ajax.translation,
        annotation: content.annotation ?? ajax.annotation,
      };
    }

    if (!content.translation && !content.annotation) {
      result.noContent.push(entry);
      console.log(`  [no-content] ${poetryId} ${entry.title}`);
      await delay(REQUEST_DELAY_MS);
      continue;
    }

    await db.poetry.update({
      where: { id: poetryId },
      data: {
        translation: content.translation,
        annotation: content.annotation,
      },
    });
    result.updatedCount += 1;
    missingIds.delete(poetryId);
    console.log(
      `  [updated] ${poetryId} ${entry.title} (T:${content.translation ? "✓" : "-"} A:${content.annotation ? "✓" : "-"})`,
    );
    await delay(REQUEST_DELAY_MS);
  }

  return result;
}

async function main() {
  const catalogKeys = process.argv.slice(2).length
    ? process.argv.slice(2)
    : Object.keys(CATALOGS);

  const poetries = await db.poetry.findMany({
    select: { id: true, sourceUid: true, title: true, author: true, lines: true, translation: true },
  });
  const candidates: PoetryMatchCandidate[] = poetries.map((p) => ({
    author: p.author,
    id: p.id,
    lines: Array.isArray(p.lines) ? p.lines.filter((l): l is string => typeof l === "string") : [],
    sourceUid: p.sourceUid,
    title: p.title,
  }));

  const missingIds = new Set(
    poetries.filter((p) => p.translation === null || p.translation === "").map((p) => p.id),
  );
  console.log(`DB poems: ${poetries.length}, missing translation: ${missingIds.size}`);

  const allResults: FillResult[] = [];
  for (const key of catalogKeys) {
    if (!(key in CATALOGS)) {
      console.error(`Unknown catalog: ${key}. Available: ${Object.keys(CATALOGS).join(", ")}`);
      continue;
    }
    console.log(`\n=== ${key} ===`);
    const r = await processCatalog(key, CATALOGS[key], candidates, missingIds);
    allResults.push(r);
  }

  console.log("\n========== SUMMARY ==========");
  for (const r of allResults) {
    console.log(
      `[${r.catalogName}] entries=${r.catalogCount} matched=${r.matchedCount} updated=${r.updatedCount} skipped(existing)=${r.skippedHasTranslation} noContent=${r.noContent.length} unmatched=${r.unmatched.length}`,
    );
  }
  console.log(`\nStill missing translation in DB: ${missingIds.size}`);
  if (missingIds.size > 0) {
    console.log("IDs:");
    for (const id of [...missingIds].sort()) console.log(`  ${id}`);
  }
}

const entrypointUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entrypointUrl && import.meta.url === entrypointUrl) {
  void main().catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exitCode = 1;
  });
}
