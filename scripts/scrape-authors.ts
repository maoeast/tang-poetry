/**
 * scrape-authors.ts — Scrape Tang dynasty poet data from guwendao.net
 *
 * Usage: tsx scripts/scrape-authors.ts
 *
 * What it does:
 * 1. Fetches all Tang dynasty author list pages from guwendao.net
 * 2. Extracts name, bio, avatar URL, detail page hash from list pages
 * 3. Fetches each author's detail page for the "人物生平" section
 * 4. Downloads avatar images to public/images/authors/{pinyin}.jpg
 * 5. Uses opencc-js to convert simplified text to traditional Chinese
 * 6. Cross-matches with the 86-poet list from data/ts300.simple.json
 * 7. Outputs data/authors.json matching the AuthorData type
 */

import * as cheerio from "cheerio";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as url from "node:url";
import OpenCC from "opencc-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const AVATAR_DIR = path.join(PROJECT_ROOT, "public", "images", "authors");

const BASE_URL = "https://www.guwendao.net";
const TANG_DYNASTY_PARAM = "%e5%94%90%e4%bb%a3"; // "唐代" URL-encoded
const LIST_URL_TEMPLATE = `${BASE_URL}/authors/default.aspx?p={page}&c=${TANG_DYNASTY_PARAM}`;
const DETAIL_URL_TEMPLATE = `${BASE_URL}/authorv_{hash}.aspx`;
const AVATAR_CDN_PREFIX = "https://ziyuan.guwendao.net/authorImg300";

const REQUEST_DELAY_MS = 500;
const DYNASTY = "唐";

// ---------------------------------------------------------------------------
// Pinyin slug mapping (86 poets from ts300)
// ---------------------------------------------------------------------------

const PINYIN_MAP: Record<string, string> = {
  骆宾王: "luobinwang",
  陈子昂: "chenziang",
  唐玄宗: "tangxuanzong",
  李白: "libai",
  王昌龄: "wangchangling",
  王之涣: "wangzhihuan",
  王建: "wangjian",
  李商隐: "lishangyin",
  韦庄: "weizhuang",
  薛逢: "xuefeng",
  马戴: "madai",
  郑畋: "zhengtian",
  张籍: "zhangji2",
  金昌绪: "jinchangxu",
  元稹: "yuanzhen",
  西鄙人: "xibiren",
  无名氏: "wumingren",
  沈佺期: "shenquangqi",
  王湾: "wangwan",
  张旭: "zhangxu",
  王维: "wangwei",
  权德舆: "quandeyu",
  韩愈: "hanyu",
  韩偓: "hanwo",
  杜荀鹤: "duxunhe",
  朱庆余: "zhuqingyu",
  杜牧: "dumu",
  许浑: "xuhun",
  张泌: "zhangmi",
  陈陶: "chentao",
  释明辩: "shimingbian",
  白居易: "baijuyi",
  李益: "liyi",
  李端: "liduan",
  司空曙: "sikongshu",
  刘长卿: "liuchangqing",
  崔曙: "cuishu",
  王翰: "wanghan",
  孟浩然: "menghaoran",
  戴叔伦: "daishulun",
  卢纶: "lulun",
  裴迪: "peidi",
  丘为: "qiuwei",
  崔颢: "cuihao",
  祖咏: "zuyong",
  李颀: "liqi",
  綦毋潜: "qiwuqian",
  常建: "changjian",
  贺知章: "hezhizhang",
  贾岛: "jiadao",
  温庭筠: "wentingjun",
  李频: "lipin",
  秦韬玉: "qintaoyu",
  周朴: "zhoup",
  崔涂: "cuitu",
  张祜: "zhanghu",
  王涯: "wangya",
  柳宗元: "liuzongyuan",
  刘禹锡: "liuyuxi",
  杜甫: "dufu",
  张九龄: "zhangjiuling",
  宋之问: "songzhiwen",
  王勃: "wangbo",
  杜审言: "dushenyan",
  朱斌: "zhubin",
  高适: "gaoshi",
  张佖: "zhangbi",
  不详: "buxiang",
  杨敬述进: "yangjingshujin",
  皎然: "jiaoran",
  孟郊: "mengjiao",
  蔡襄: "caixiang",
  钱起: "qianqi",
  元结: "yuanjie",
  张继: "zhangji",
  韩翃: "hanhong",
  韦应物: "weiyingwu",
  岑参: "censhen",
  孙革: "sunge",
  张乔: "zhangqiao",
  皇甫冉: "huangfuran",
  刘方平: "liufangping",
  刘眘虚: "liushenxu",
  柳中庸: "liuzhongyong",
  严维: "yanwei",
  顾况: "gukuang",
};

// Poets excluded from scraping (no meaningful data on guwendao)
const EXCLUDED_POETS = new Set(["无名氏", "不详", "西鄙人", "杨敬述进"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

/** Extract a short bio from the full guwendao bio text (cut at first "►") */
function cleanBio(raw: string): string {
  return raw
    .replace(/►.*$/s, "") // Remove "► 1126篇诗文　► 6181条名句"
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract the source URL from the hidden textarea content (last line) */
function extractSourceUrl(textareaContent: string): string | null {
  const lines = textareaContent.split("\n").map((l) => l.trim());
  const lastLine = lines[lines.length - 1];
  if (lastLine && lastLine.startsWith("https://www.guwendao.net/authorv_")) {
    return lastLine;
  }
  return null;
}

/** Extract the detail page hash from an author link like /authorv_{hash}.aspx */
function extractHash(href: string): string | null {
  const match = href.match(/authorv_([a-f0-9]+)\.aspx/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Scraping: List pages
// ---------------------------------------------------------------------------

interface RawAuthorEntry {
  name: string;
  bio: string;
  avatarUrl: string;
  detailHash: string;
  sourceUrl: string;
}

async function scrapeAllListPages(): Promise<RawAuthorEntry[]> {
  const allEntries: RawAuthorEntry[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const url = LIST_URL_TEMPLATE.replace("{page}", String(page));
    console.log(`Fetching list page ${page}: ${url}`);

    const res = await fetchWithRetry(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    // Each author card is in a div.sonspic (skip #sonsyuanwen which is the detail view)
    const cards = $("div.sonspic").not("#sonsyuanwen");
    console.log(`  Found ${cards.length} author cards on page ${page}`);

    cards.each((_i, card) => {
      // Get the hidden textarea content (contains full bio + source URL)
      // The textarea is a sibling of the sonspic div
      const prevTextarea = $(card).prev("div").find("textarea");
      const textareaContent = prevTextarea.text().trim();
      const sourceUrl = extractSourceUrl(textareaContent) ?? "";

      // Avatar image
      const avatarImg = $(card).find("div.divimg a img").first();
      const avatarSrc = avatarImg.attr("src") || "";

      // Detail page link (from avatar anchor or name anchor)
      const detailLink =
        $(card).find("div.divimg a").first().attr("href") ||
        $(card).find('p a[href*="authorv_"]').first().attr("href") ||
        "";
      const detailHash = extractHash(detailLink) ?? "";

      // Author name
      const name = $(card).find('p a[href*="authorv_"] b').first().text().trim();

      // Bio paragraph
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

    // Check if there is a next page
    const nextLink = $('a.amore[href*="p="]').first();
    const nextHref = nextLink.attr("href") || "";
    // If the "next" link is styled as disabled (no href with next page), stop
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

  console.log(`Total authors scraped from list: ${allEntries.length}`);
  return allEntries;
}

// ---------------------------------------------------------------------------
// Scraping: Detail pages (for "人物生平" section)
// ---------------------------------------------------------------------------

async function scrapeLifeStory(detailHash: string): Promise<string> {
  const detailUrl = DETAIL_URL_TEMPLATE.replace("{hash}", detailHash);
  console.log(`  Fetching detail: ${detailUrl}`);

  try {
    const res = await fetchWithRetry(detailUrl);
    const html = await res.text();
    const $ = cheerio.load(html);

    // The detail page has sections like "轶事典故", "家庭成员", "后世纪念",
    // "主要成就", "人物生平" — we want "人物生平"
    const sections = $("div.sons div.contyishang");
    let lifeStory = "";

    sections.each((_i, section) => {
      const heading = $(section).find("h2 span").first().text().trim();
      if (heading === "人物生平") {
        // Collect all <p> text content
        const paragraphs: string[] = [];
        $(section)
          .find("p")
          .each((_j, p) => {
            const text = $(p).text().trim();
            if (text) paragraphs.push(text);
          });
        lifeStory = paragraphs.join("\n\n");
        return false; // break
      }
    });

    return lifeStory;
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
  pinyin: string,
): Promise<string | null> {
  if (!remoteUrl) return null;

  const localPath = path.join(AVATAR_DIR, `${pinyin}.jpg`);

  // Skip if already downloaded
  try {
    await fs.access(localPath);
    return `/images/authors/${pinyin}.jpg`;
  } catch {
    // File doesn't exist, proceed to download
  }

  try {
    console.log(`  Downloading avatar: ${remoteUrl}`);
    const res = await fetchWithRetry(remoteUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(localPath, buffer);
    console.log(`  Saved: ${localPath}`);
    return `/images/authors/${pinyin}.jpg`;
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

interface AuthorOutput {
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

  // 1. Load local poet names from ts300.simple.json
  const ts300Path = path.join(DATA_DIR, "ts300.simple.json");
  const ts300Raw = await fs.readFile(ts300Path, "utf-8");
  const ts300 = JSON.parse(ts300Raw) as Array<{ author: string }>;
  const localAuthors = [...new Set(ts300.map((p) => p.author))];
  console.log(`Local poet count: ${localAuthors.length}`);

  // 2. Ensure avatar output directory exists
  await fs.mkdir(AVATAR_DIR, { recursive: true });

  // 3. Initialize opencc-js converter
  const converter = OpenCC.Converter({ from: "cn", to: "tw" });

  // 4. Scrape all Tang dynasty list pages
  const rawEntries = await scrapeAllListPages();

  // 5. Build a lookup by name
  const entryByName = new Map<string, RawAuthorEntry>();
  for (const entry of rawEntries) {
    entryByName.set(entry.name, entry);
  }

  // 6. For each local author, build the output record
  const results: AuthorOutput[] = [];

  for (const authorName of localAuthors) {
    console.log(`\nProcessing: ${authorName}`);

    const pinyin = PINYIN_MAP[authorName] || "";
    const entry = entryByName.get(authorName);

    if (EXCLUDED_POETS.has(authorName) || !entry) {
      // No match or excluded — minimal record
      console.log(`  No match on guwendao or excluded.`);
      results.push({
        name: authorName,
        nameZhHant: converter(authorName),
        avatarUrl: null,
        dynasty: DYNASTY,
        courtesyName: null,
        literaryName: null,
        bio: null,
        bioZhHant: null,
        lifeStory: null,
        lifeStoryZhHant: null,
        sourceUrl: null,
      });
      continue;
    }

    // Download avatar
    let localAvatarUrl: string | null = null;
    if (pinyin) {
      localAvatarUrl = await downloadAvatar(entry.avatarUrl, pinyin);
    }

    // Fetch detail page for life story
    let lifeStory = "";
    if (entry.detailHash) {
      lifeStory = await scrapeLifeStory(entry.detailHash);
      await delay(REQUEST_DELAY_MS);
    }

    // Extract courtesy/literary name from bio patterns
    const courtesyMatch = entry.bio.match(/字([^\s,，、）)]{1,6})/);
    const literaryMatch = entry.bio.match(
      /号([^\s,，、）)]{1,10}?)(?:居士|道人|山人|先生|散人)/,
    );

    const courtesyName = courtesyMatch ? courtesyMatch[1] : null;
    const literaryName = literaryMatch
      ? literaryMatch[0]
      : (() => {
          // Try broader pattern: "号XXX"
          const m = entry.bio.match(/号([^\s,，、）)]{1,10}?(?:居士|道人|山人|先生|散人|客))/);
          return m ? m[0] : null;
        })();

    // Convert to traditional Chinese
    const bioZhHant = entry.bio ? converter(entry.bio) : null;
    const lifeStoryZhHant = lifeStory ? converter(lifeStory) : null;
    const nameZhHant = converter(authorName);

    results.push({
      name: authorName,
      nameZhHant,
      avatarUrl: localAvatarUrl,
      dynasty: DYNASTY,
      courtesyName,
      literaryName,
      bio: entry.bio || null,
      bioZhHant,
      lifeStory: lifeStory || null,
      lifeStoryZhHant,
      sourceUrl: entry.sourceUrl || null,
    });

    console.log(
      `  ✓ bio: ${entry.bio ? entry.bio.substring(0, 30) + "..." : "null"}, lifeStory: ${lifeStory ? lifeStory.substring(0, 30) + "..." : "null"}`,
    );
  }

  // 7. Write output
  const outputPath = path.join(DATA_DIR, "authors.json");
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\nOutput written to ${outputPath}`);
  console.log(`Total entries: ${results.length}`);

  // Summary
  const matched = results.filter((r) => r.bio !== null).length;
  const unmatched = results.filter((r) => r.bio === null).length;
  const withLifeStory = results.filter((r) => r.lifeStory !== null).length;
  const withAvatar = results.filter((r) => r.avatarUrl !== null).length;
  console.log(
    `Matched: ${matched}, Unmatched: ${unmatched}, With life story: ${withLifeStory}, With avatar: ${withAvatar}`,
  );

  console.log("\n=== scrape-authors: 完成 ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
