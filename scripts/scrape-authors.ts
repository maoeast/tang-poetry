/**
 * scrape-authors.ts — Scrape poet data from guwendao.net for all dynasties
 *
 * Usage: tsx scripts/scrape-authors.ts [--dynasty 宋] [--dry-run] [--skip-detail]
 *
 * What it does:
 * 1. Loads existing data/authors.json (333 entries)
 * 2. For each dynasty, fetches all author list pages from guwendao.net
 * 3. Matches scraped authors to existing entries by name
 * 4. Supplements missing bio/lifeStory/avatarUrl
 * 5. Downloads avatar images using pinyin-pro for slug generation
 * 6. Writes updated data/authors.json
 */

import * as cheerio from "cheerio";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as url from "node:url";
import OpenCC from "opencc-js";
import { pinyin } from "pinyin-pro";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const AVATAR_DIR = path.join(PROJECT_ROOT, "public", "images", "authors");

const BASE_URL = "https://www.guwendao.net";
const LIST_URL_TEMPLATE = `${BASE_URL}/authors/default.aspx?p={page}&c={dynastyEncoded}`;
const DETAIL_URL_TEMPLATE = `${BASE_URL}/authorv_{hash}.aspx`;
const AVATAR_CDN_PREFIX = "https://ziyuan.guwendao.net/authorImg300";

const REQUEST_DELAY_MS = 500;

// Dynasty name → URL-encoded value (guwendao uses simplified Chinese)
const DYNASTIES = [
  "唐代",
  "宋代",
  "魏晋",
  "明代",
  "清代",
  "元代",
  "先秦",
] as const;

// Dynasty display name used in authors.json
const DYNASTY_LABEL: Record<string, string> = {
  唐代: "唐",
  宋代: "宋",
  魏晋: "魏晋",
  明代: "明",
  清代: "清",
  元代: "元",
  先秦: "先秦",
};

// Poets excluded from scraping (no meaningful data)
const EXCLUDED_POETS = new Set(["无名氏", "不详", "西鄙人", "杨敬述进"]);

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipDetail = args.includes("--skip-detail");
const dynastyArg = args.find((a) => a.startsWith("--dynasty"));
const targetDynasty = dynastyArg ? dynastyArg.split("=")[1] || args[args.indexOf(dynastyArg) + 1] : null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a pinyin slug from a Chinese name (e.g. 苏轼 → suzhe → sushi) */
function nameToPinyinSlug(name: string): string {
  const py = pinyin(name, { toneType: "none", type: "array" }).join("");
  return py || "unknown";
}

async function fetchWithRetry(
  input: string,
  retries = 3,
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "zh-CN,zh;q=0.9",
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${input}`);
      }
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(
        `  Retry ${attempt}/${retries} for ${input}: ${err instanceof Error ? err.message : err}`,
      );
      await delay(1000 * attempt);
    }
  }
  throw new Error("Unreachable");
}

function cleanBio(raw: string): string {
  return raw
    .replace(/►.*$/s, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSourceUrl(textareaContent: string): string | null {
  const lines = textareaContent.split("\n").map((l) => l.trim());
  const lastLine = lines[lines.length - 1];
  if (lastLine && lastLine.startsWith("https://www.guwendao.net/authorv_")) {
    return lastLine;
  }
  return null;
}

function extractHash(href: string): string | null {
  const match = href.match(/authorv_([a-f0-9]+)\.aspx/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Scraping: List pages for a single dynasty
// ---------------------------------------------------------------------------

interface RawAuthorEntry {
  name: string;
  bio: string;
  avatarUrl: string;
  detailHash: string;
  sourceUrl: string;
}

async function scrapeDynastyListPages(
  dynastyParam: string,
): Promise<RawAuthorEntry[]> {
  const encoded = encodeURIComponent(dynastyParam);
  const allEntries: RawAuthorEntry[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const pageUrl = LIST_URL_TEMPLATE
      .replace("{page}", String(page))
      .replace("{dynastyEncoded}", encoded);
    console.log(`Fetching list page ${page}: ${pageUrl}`);

    const res = await fetchWithRetry(pageUrl);
    const html = await res.text();
    const $ = cheerio.load(html);

    const cards = $("div.sonspic").not("#sonsyuanwen");
    console.log(`  Found ${cards.length} author cards on page ${page}`);

    cards.each((_i, card) => {
      const prevTextarea = $(card).prev("div").find("textarea");
      const textareaContent = prevTextarea.text().trim();
      const sourceUrl = extractSourceUrl(textareaContent) ?? "";

      const avatarImg = $(card).find("div.divimg a img").first();
      const avatarSrc = avatarImg.attr("src") || "";

      const detailLink =
        $(card).find("div.divimg a").first().attr("href") ||
        $(card).find('p a[href*="authorv_"]').first().attr("href") ||
        "";
      const detailHash = extractHash(detailLink) ?? "";

      const name = $(card).find('p a[href*="authorv_"] b').first().text().trim();

      const bioP = $(card).find('p[style*="margin-top:10px"]').first();
      const bio = bioP.text().trim();

      if (name) {
        allEntries.push({
          name,
          bio: cleanBio(bio),
          avatarUrl: avatarSrc,
          detailHash,
          sourceUrl: sourceUrl || (detailHash ? DETAIL_URL_TEMPLATE.replace("{hash}", detailHash) : ""),
        });
      }
    });

    // Check for next page
    const nextLink = $('a.amore[href*="p="]').first();
    const nextHref = nextLink.attr("href") || "";
    if (
      !nextHref ||
      nextLink.attr("style")?.includes("color:#808080") ||
      !nextHref.includes(`p=${page + 1}`)
    ) {
      hasNext = false;
    } else {
      page++;
      await delay(REQUEST_DELAY_MS);
    }
  }

  return allEntries;
}

// ---------------------------------------------------------------------------
// Scraping: Detail page for "人物生平" via AJAX API
// ---------------------------------------------------------------------------

/** Extract the ziliaoShow ID from the detail page HTML */
function extractZiliaoId(html: string, sectionName: string): string | null {
  // Find the section heading, then the nearest ziliaoShow call
  const sectionIdx = html.indexOf(sectionName);
  if (sectionIdx < 0) return null;

  // Search forward from the heading for ziliaoShow
  const afterSection = html.substring(sectionIdx, sectionIdx + 2000);
  // Pattern: ziliaoShow(533,'DBDA6C34D12A597E')
  const match = afterSection.match(
    /ziliaoShow\(\d+,'([A-F0-9]+)'\)/,
  );
  return match ? match[1] : null;
}

/** Fetch full lifeStory via AJAX API (no login required) */
async function scrapeLifeStory(detailHash: string): Promise<string> {
  const detailUrl = DETAIL_URL_TEMPLATE.replace("{hash}", detailHash);
  console.log(`  Fetching detail: ${detailUrl}`);

  try {
    const res = await fetchWithRetry(detailUrl);
    const html = await res.text();

    // Extract the ziliaoShow encrypted ID for "人物生平"
    const ziliaoId = extractZiliaoId(html, "人物生平");
    if (!ziliaoId) {
      console.log(`  No ziliaoShow ID found for 人物生平, trying direct parse`);
      // Fallback: try parsing truncated preview from the page
      const $ = cheerio.load(html);
      const sections = $("div.sons div.contyishang");
      let lifeStory = "";
      sections.each((_i, section) => {
        const heading = $(section).find("h2 span").first().text().trim();
        if (heading === "人物生平") {
          const paragraphs: string[] = [];
          $(section).find("p").each((_j, p) => {
            const text = $(p).text().trim();
            if (text) paragraphs.push(text);
          });
          lifeStory = paragraphs.join("\n\n");
          return false;
        }
      });
      return lifeStory;
    }

    // Fetch full content via AJAX API
    const ajaxUrl = `${BASE_URL}/authors/ajaxziliao.aspx?id=${ziliaoId}`;
    console.log(`  Fetching full lifeStory: ${ajaxUrl}`);
    const ajaxRes = await fetchWithRetry(ajaxUrl);
    const ajaxHtml = await ajaxRes.text();
    const $ = cheerio.load(ajaxHtml);

    const paragraphs: string[] = [];
    $("p").each((_j, p) => {
      const text = $(p).text().trim();
      // Skip the "收起" link text
      if (text && !text.startsWith("▲") && text !== "收起") {
        paragraphs.push(text);
      }
    });

    return paragraphs.join("\n\n");
  } catch (err) {
    console.warn(
      `  Failed to fetch detail ${detailUrl}: ${err instanceof Error ? err.message : err}`,
    );
    return "";
  }
}

// ---------------------------------------------------------------------------
// Avatar download
// ---------------------------------------------------------------------------

async function downloadAvatar(
  remoteUrl: string,
  slug: string,
): Promise<string | null> {
  if (!remoteUrl) return null;

  const localPath = path.join(AVATAR_DIR, `${slug}.jpg`);

  try {
    await fs.access(localPath);
    return `/images/authors/${slug}.jpg`;
  } catch {
    // doesn't exist, proceed
  }

  if (dryRun) {
    console.log(`  [dry-run] Would download avatar: ${remoteUrl} → ${slug}.jpg`);
    return null;
  }

  try {
    console.log(`  Downloading avatar: ${remoteUrl}`);
    const res = await fetchWithRetry(remoteUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(localPath, buffer);
    console.log(`  Saved: ${localPath}`);
    return `/images/authors/${slug}.jpg`;
  } catch (err) {
    console.warn(
      `  Failed to download avatar ${remoteUrl}: ${err instanceof Error ? err.message : err}`,
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface AuthorEntry {
  name: string;
  nameZhHant: string | null;
  avatarUrl: string | null;
  dynasty: string;
  courtesyName: string | null;
  literaryName: string | null;
  bio: string | null;
  bioZhHant: string | null;
  lifeStory: string | null;
  lifeStoryZhHant: string | null;
  sourceUrl: string | null;
}

async function main(): Promise<void> {
  console.log("=== scrape-authors: 开始 ===\n");
  if (dryRun) console.log("DRY RUN — no writes\n");
  if (targetDynasty) console.log(`Target dynasty: ${targetDynasty}\n`);

  // 1. Load existing authors.json
  const authorsPath = path.join(DATA_DIR, "authors.json");
  const authorsRaw = await fs.readFile(authorsPath, "utf-8");
  const authors: AuthorEntry[] = JSON.parse(authorsRaw);
  console.log(`Loaded ${authors.length} existing author entries`);

  // Build lookup: name → author entry (for matching)
  const authorByName = new Map<string, AuthorEntry>();
  for (const a of authors) {
    authorByName.set(a.name, a);
  }

  // Track which authors get updated
  const updatedNames = new Set<string>();

  // 2. Ensure avatar directory exists
  await fs.mkdir(AVATAR_DIR, { recursive: true });

  // 3. Initialize converters
  const converter = OpenCC.Converter({ from: "cn", to: "tw" });

  // 4. Determine which dynasties to scrape
  const dynastiesToScrape = targetDynasty
    ? DYNASTIES.filter((d) => DYNASTY_LABEL[d] === targetDynasty || d === targetDynasty)
    : (DYNASTIES as readonly string[]);

  if (dynastiesToScrape.length === 0) {
    console.error(`Unknown dynasty: ${targetDynasty}`);
    console.error(`Valid options: ${DYNASTIES.map((d) => DYNASTY_LABEL[d]).join(", ")}`);
    process.exit(1);
  }

  // 5. Scrape each dynasty
  for (const dynastyParam of dynastiesToScrape) {
    const dynastyLabel = DYNASTY_LABEL[dynastyParam] || dynastyParam;
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Dynasty: ${dynastyParam} (${dynastyLabel})`);
    console.log(`${"=".repeat(60)}`);

    const rawEntries = await scrapeDynastyListPages(dynastyParam);
    console.log(`Scraped ${rawEntries.length} authors for ${dynastyParam}`);

    // Build lookup by name for this dynasty
    const scrapedByName = new Map<string, RawAuthorEntry>();
    for (const entry of rawEntries) {
      scrapedByName.set(entry.name, entry);
    }

    // Match against existing authors that belong to this dynasty and need data
    const existingInDynasty = authors.filter((a) => a.dynasty === dynastyLabel);
    console.log(`Existing authors in ${dynastyLabel}: ${existingInDynasty.length}`);

    for (const existing of existingInDynasty) {
      if (EXCLUDED_POETS.has(existing.name)) continue;
      const hasFullLifeStory = existing.lifeStory && existing.lifeStory.length >= 350;
      if (existing.bio && hasFullLifeStory) {
        // Already has both and lifeStory is not truncated — skip
        continue;
      }

      const scraped = scrapedByName.get(existing.name);
      if (!scraped) {
        console.log(`  [no match] ${existing.name}`);
        continue;
      }

      console.log(`\nProcessing: ${existing.name}`);

      // Update bio if missing
      if (!existing.bio && scraped.bio) {
        existing.bio = scraped.bio;
        existing.bioZhHant = converter(scraped.bio);
        console.log(`  ✓ bio: ${scraped.bio.substring(0, 40)}...`);
      }

      // Update sourceUrl if missing
      if (!existing.sourceUrl && scraped.sourceUrl) {
        existing.sourceUrl = scraped.sourceUrl;
      }

      // Extract courtesy/literary name if missing
      if (!existing.courtesyName && scraped.bio) {
        const courtesyMatch = scraped.bio.match(/字([^\s,，、）)]{1,6})/);
        if (courtesyMatch) existing.courtesyName = courtesyMatch[1];
      }
      if (!existing.literaryName && scraped.bio) {
        const literaryMatch = scraped.bio.match(
          /号([^\s,，、）)]{1,10}?(?:居士|道人|山人|先生|散人|客))/,
        );
        if (literaryMatch) {
          existing.literaryName = literaryMatch[0];
        } else {
          const m = scraped.bio.match(/号([^\s,，、）)]{1,10}?(?:居士|道人|山人|先生|散人))/);
          if (m) existing.literaryName = m[0];
        }
      }

      // Download avatar if missing
      if (!existing.avatarUrl && scraped.avatarUrl) {
        const slug = nameToPinyinSlug(existing.name);
        const avatarResult = await downloadAvatar(scraped.avatarUrl, slug);
        if (avatarResult) {
          existing.avatarUrl = avatarResult;
        }
      }

      // Fetch life story if missing or truncated (< 350 chars = preview-only from old scrape)
      const needsLifeStory = !existing.lifeStory || existing.lifeStory.length < 350;
      if (needsLifeStory && scraped.detailHash && !skipDetail) {
        const lifeStory = await scrapeLifeStory(scraped.detailHash);
        if (lifeStory && lifeStory.length > (existing.lifeStory?.length ?? 0)) {
          existing.lifeStory = lifeStory;
          existing.lifeStoryZhHant = converter(lifeStory);
          console.log(`  ✓ lifeStory (${lifeStory.length} chars): ${lifeStory.substring(0, 40)}...`);
        }
        await delay(REQUEST_DELAY_MS);
      }

      // Update nameZhHant if null
      if (!existing.nameZhHant) {
        existing.nameZhHant = converter(existing.name);
      }

      updatedNames.add(existing.name);
    }
  }

  // 6. Handle authors not found on guwendao (ensure nameZhHant is set)
  const addedCount = 0;
  for (const a of authors) {
    if (!a.nameZhHant) {
      a.nameZhHant = converter(a.name);
    }
  }

  // 7. Write output
  if (!dryRun) {
    await fs.writeFile(authorsPath, JSON.stringify(authors, null, 2), "utf-8");
    console.log(`\nOutput written to ${authorsPath}`);
  } else {
    console.log(`\n[dry-run] Would write ${authors.length} entries to ${authorsPath}`);
  }

  // Summary
  console.log(`\nTotal entries: ${authors.length}`);
  console.log(`Updated: ${updatedNames.size}`);
  const withBio = authors.filter((a) => a.bio !== null).length;
  const withLifeStory = authors.filter((a) => a.lifeStory !== null).length;
  const withAvatar = authors.filter((a) => a.avatarUrl !== null).length;
  console.log(`With bio: ${withBio}, With lifeStory: ${withLifeStory}, With avatar: ${withAvatar}`);

  console.log("\n=== scrape-authors: 完成 ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
