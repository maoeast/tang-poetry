import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import * as cheerio from "cheerio";

const BASE_URL = "https://www.guwendao.net";
const REQUEST_DELAY_MS = 300;
const FETCH_TIMEOUT_MS = 30_000;
const DATA_DIR = path.join(process.cwd(), "data");

const HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "zh-CN,zh;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

// --- Dynasty mapping for gs300 sections ---

const GS300_SECTION_DYNASTY: Record<string, string> = {
  先秦两汉诗: "先秦",
  魏晋南北朝诗: "魏晋",
  宋诗: "宋",
};

// The last 3 sections are all titled "五言绝句" — map by order
const GS300_FORM_SECTIONS = [
  { pattern: "五言绝句", dynasty: "元", order: 0 },
  { pattern: "五言绝句", dynasty: "明", order: 1 },
  { pattern: "五言绝句", dynasty: "清", order: 2 },
];

// --- Types ---

type CatalogEntry = {
  url: string;
  hash: string;
  title: string;
  author: string;
  section: string;
  dynasty: string;
};

type RawPoemData = {
  id: string;
  title: string;
  author: string;
  paragraphs: string[];
  tags: string[];
};

// --- Catalog parsing ---

function parseGs300Catalog(html: string): CatalogEntry[] {
  const $ = cheerio.load(html);
  const entries: CatalogEntry[] = [];

  // Track section names from .bookMl headers
  const sections: { name: string; dynasty: string }[] = [];
  let currentDynasty = "先秦";
  let formSectionIndex = 0;

  $(".bookMl").each((_, el) => {
    const name = $(el).find("strong").text().trim();
    if (GS300_SECTION_DYNASTY[name]) {
      currentDynasty = GS300_SECTION_DYNASTY[name]!;
      sections.push({ name, dynasty: currentDynasty });
    } else if (name === "五言绝句") {
      const info = GS300_FORM_SECTIONS[formSectionIndex];
      currentDynasty = info?.dynasty ?? "未知";
      formSectionIndex++;
      sections.push({ name, dynasty: currentDynasty });
    }
  });

  // Now parse poems, associating each with its section
  // Strategy: iterate through all typecont divs in order
  // Each .bookMl marks a section boundary, all subsequent spans belong to it
  let sectionIdx = -1;
  const allTypecont = $("div.typecont");

  allTypecont.each((_, contEl) => {
    const $cont = $(contEl);
    const bookMl = $cont.find("> .bookMl").first();

    if (bookMl.length) {
      sectionIdx++;
    }

    const dynasty = sectionIdx >= 0 && sectionIdx < sections.length
      ? sections[sectionIdx]!.dynasty
      : "未知";
    const section = sectionIdx >= 0 && sectionIdx < sections.length
      ? sections[sectionIdx]!.name
      : "未知";

    $cont.find("> span").each((_, spanEl) => {
      const $span = $(spanEl);
      const $a = $span.find("a[href^='/shiwenv_']").first();
      if (!$a.length) return;

      const href = $a.attr("href")!;
      const title = $a.text().trim();
      const rest = $span.text().replace($a.text(), "").trim();

      // Author in parentheses: (Author) or 《Author》
      const author = rest.replace(/^[《]|[》]$/g, "").replace(/[()（）]/g, "").trim();

      const hashMatch = href.match(/shiwenv_([a-f0-9]+)\.aspx/);
      const hash = hashMatch ? hashMatch[1]! : "";

      entries.push({
        url: `${BASE_URL}${href}`,
        hash,
        title,
        author,
        section,
        dynasty,
      });
    });
  });

  return entries;
}

function parseSc200Catalog(html: string): CatalogEntry[] {
  const $ = cheerio.load(html);
  const entries: CatalogEntry[] = [];

  $("div.typecont span").each((_, el) => {
    const $span = $(el);
    const $a = $span.find("a[href^='/shiwenv_']").first();
    if (!$a.length) return;

    const href = $a.attr("href")!;
    const title = $a.text().trim();
    const rest = $span.text().replace($a.text(), "").trim();
    const author = rest.replace(/[()（）]/g, "").trim();

    const hashMatch = href.match(/shiwenv_([a-f0-9]+)\.aspx/);
    const hash = hashMatch ? hashMatch[1]! : "";

    entries.push({
      url: `${BASE_URL}${href}`,
      hash,
      title,
      author,
      section: "宋词",
      dynasty: "宋",
    });
  });

  return entries;
}

// --- Detail page parsing ---

function extractPoemBody(html: string, hash: string): string[] {
  const $ = cheerio.load(html);

  // Target the specific contson div by ID
  const contson = $(`#contson${hash}`);
  if (!contson.length) {
    // Fallback: first contson in sonsyuanwen
    const fallback = $("#sonsyuanwen .contson").first();
    if (fallback.length) return parseContson($, fallback);
    throw new Error(`No contson found for hash ${hash}`);
  }

  return parseContson($, contson);
}

function parseContson($: cheerio.CheerioAPI, el: cheerio.Cheerio<cheerio.Element>): string[] {
  // Get inner HTML, replace <br> with newline marker, then extract text
  let raw = el.html() ?? "";

  // Replace <br> and </p><p> with newlines
  raw = raw.replace(/<br\s*\/?>/gi, "\n");
  raw = raw.replace(/<\/p>\s*<p>/gi, "\n");
  raw = raw.replace(/<\/p>/gi, "");
  raw = raw.replace(/<p>/gi, "\n");

  // Strip remaining HTML tags
  raw = raw.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  raw = raw.replace(/&nbsp;/g, " ");
  raw = raw.replace(/&lt;/g, "<");
  raw = raw.replace(/&gt;/g, ">");
  raw = raw.replace(/&amp;/g, "&");
  raw = raw.replace(/&ldquo;/g, "\u201C");
  raw = raw.replace(/&rdquo;/g, "\u201D");
  raw = raw.replace(/&hellip;/g, "\u2026");

  // Split into lines, trim, filter empty
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return lines;
}

// --- Deduplication ---

async function loadExistingPoems(): Promise<Set<string>> {
  const filePath = path.join(DATA_DIR, "ts300.simple.json");
  const raw = await readFile(filePath, "utf8");
  const poems = JSON.parse(raw) as Array<{ title: string; author: string }>;
  return new Set(poems.map((p) => `${p.title}|${p.author}`));
}

// --- Tags ---

function buildGs300Tags(entry: CatalogEntry, _paragraphs: string[]): string[] {
  const tags: string[] = ["古诗三百"];
  // Could add form/genre tags from section info
  // For now just source tag — form tags can be enriched later
  return tags;
}

function buildSc200Tags(entry: CatalogEntry, paragraphs: string[]): string[] {
  const tags: string[] = ["宋词精选", "词"];

  // Extract 词牌名 from title (part before ·)
  const cipaiMatch = entry.title.match(/^(.+?)·/);
  if (cipaiMatch) {
    tags.push(cipaiMatch[1]!);
  }

  // Classify ci by length
  const totalChars = paragraphs.join("").replace(/[，。、；：？！""''（）《》\s]/g, "").length;
  if (totalChars <= 58) {
    tags.push("小令");
  } else if (totalChars <= 90) {
    tags.push("中调");
  } else {
    tags.push("长调");
  }

  return tags;
}

// --- Main pipeline ---

async function scrapeCatalog(
  source: "gs300" | "sc200",
): Promise<CatalogEntry[]> {
  const url =
    source === "gs300"
      ? `${BASE_URL}/gushi/sanbai.aspx`
      : `${BASE_URL}/gushi/songci.aspx`;

  console.error(`[${source}] Fetching catalog: ${url}`);
  const html = await fetchHtml(url);

  const entries =
    source === "gs300" ? parseGs300Catalog(html) : parseSc200Catalog(html);

  console.error(`[${source}] Found ${entries.length} catalog entries`);
  return entries;
}

async function scrapeDetails(
  source: "gs300" | "sc200",
  entries: CatalogEntry[],
  existingSet: Set<string>,
): Promise<RawPoemData[]> {
  const results: RawPoemData[] = [];
  let skipped = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;

    // Dedup check
    const dedupKey = `${entry.title}|${entry.author}`;
    if (existingSet.has(dedupKey)) {
      console.error(`  [${i + 1}/${entries.length}] SKIP (dup): ${entry.title} (${entry.author})`);
      skipped++;
      continue;
    }

    console.error(`  [${i + 1}/${entries.length}] ${entry.title} (${entry.author})`);

    try {
      const detailHtml = await fetchHtml(entry.url);
      const paragraphs = extractPoemBody(detailHtml, entry.hash);

      if (paragraphs.length === 0) {
        console.error(`    WARNING: empty paragraphs, skipping`);
        continue;
      }

      const tags =
        source === "gs300"
          ? buildGs300Tags(entry, paragraphs)
          : buildSc200Tags(entry, paragraphs);

      results.push({
        id: crypto.randomUUID(),
        title: entry.title,
        author: entry.author,
        paragraphs,
        tags,
      });
    } catch (err) {
      console.error(`    ERROR: ${err}`);
    }

    await delay(REQUEST_DELAY_MS);
  }

  console.error(`[${source}] Scraped: ${results.length}, Skipped (dup): ${skipped}`);
  return results;
}

async function main() {
  const source = process.argv[2] as "gs300" | "sc200" | undefined;

  if (!source || (source !== "gs300" && source !== "sc200")) {
    console.error("Usage: tsx scripts/scrape-guwendao-catalog.ts <gs300|sc200>");
    process.exit(1);
  }

  const existingSet = await loadExistingPoems();
  console.error(`Loaded ${existingSet.size} existing poems for dedup`);

  const entries = await scrapeCatalog(source);
  const poems = await scrapeDetails(source, entries, existingSet);

  const outPath = path.join(DATA_DIR, `${source}.simple.json`);
  await writeFile(outPath, `${JSON.stringify(poems, null, 2)}\n`, "utf8");
  console.error(`Wrote ${poems.length} poems to ${outPath}`);
}

const entrypointUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;

if (entrypointUrl && import.meta.url === entrypointUrl) {
  void main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
