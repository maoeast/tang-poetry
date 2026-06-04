import * as cheerio from "cheerio";
import { pinyin } from "pinyin-pro";

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ log: ["error", "warn"] });

const BASE_URL = "https://www.guwendao.net";
const HEADING_TRANSLATION_ANNOTATION = "\u8bd1\u6587\u53ca\u6ce8\u91ca";
const LABEL_TRANSLATION = "\u8bd1\u6587";
const LABEL_ANNOTATION = "\u6ce8\u91ca";
const DYNASTY_TANG = "\u5510";
const TAG_TS300 = "\u5510\u8bd7\u4e09\u767e\u9996";
const TAG_MANUAL = "\u53e4\u6587\u5c9b\u8865\u5f55";

type Target =
  | {
      mode: "update";
      poetryId: string;
      detailPath: string;
    }
  | {
      mode: "create";
      poetryId: string;
      detailPath: string;
      imageKey: string;
    };

const TARGETS: Target[] = [
  { mode: "update", poetryId: "ts300-0198", detailPath: "/shiwenv_f076628e7095.aspx" },
  { mode: "update", poetryId: "ts300-0071", detailPath: "/shiwenv_b8d00bf5329b.aspx" },
  { mode: "create", poetryId: "ts300-extra-0001", detailPath: "/shiwenv_24dacc9084c8.aspx", imageKey: "ts300-extra-0001" },
  { mode: "update", poetryId: "ts300-0049", detailPath: "/shiwenv_4508caf3b53b.aspx" },
  { mode: "create", poetryId: "ts300-extra-0002", detailPath: "/shiwenv_026b627c41f6.aspx", imageKey: "ts300-extra-0002" },
  { mode: "update", poetryId: "ts300-0003", detailPath: "/shiwenv_325d2f85a89e.aspx" },
  { mode: "create", poetryId: "ts300-extra-0003", detailPath: "/shiwenv_e2890c61279c.aspx", imageKey: "ts300-extra-0003" },
  { mode: "update", poetryId: "ts300-0081", detailPath: "/shiwenv_a0d7b609d5a0.aspx" },
  { mode: "create", poetryId: "ts300-extra-0004", detailPath: "/shiwenv_b2db4922a8d6.aspx", imageKey: "ts300-extra-0004" },
  { mode: "update", poetryId: "ts300-0363", detailPath: "/shiwenv_888beab9cc48.aspx" },
  { mode: "update", poetryId: "ts300-0029", detailPath: "/shiwenv_2d27cb0ecae4.aspx" },
  { mode: "update", poetryId: "ts300-0297", detailPath: "/shiwenv_ad4d98d510ea.aspx" },
  { mode: "update", poetryId: "ts300-0262", detailPath: "/shiwenv_d5cea0c3607d.aspx" },
  { mode: "update", poetryId: "ts300-0336", detailPath: "/shiwenv_4c7868ec4409.aspx" },
];

function decodeText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&ldquo;/g, "\u201c")
    .replace(/&rdquo;/g, "\u201d")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&hellip;/g, "\u2026")
    .replace(/&amp;/g, "&")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function lineToPinyin(line: string) {
  const chars = [...line].filter((ch) => /[\u3400-\u9fff]/u.test(ch));
  if (chars.length === 0) {
    return "";
  }

  return pinyin(chars.join(""), {
    toneType: "symbol",
    type: "array",
  }).join(" ");
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

function extractTranslationAnnotationFromHtml(html: string) {
  const $ = cheerio.load(html);
  let translation: string | null = null;
  let annotation: string | null = null;

  $(".contyishang p").each((_index, element) => {
    const cloned = $(element).clone();
    cloned.find("a").remove();
    const label = cloned.find("strong").first().text().trim().replace(/\s+/g, "");
    cloned.find("strong").remove();
    const text = decodeText(cloned.html() ?? "");

    if (label.includes(LABEL_TRANSLATION)) {
      translation = text || null;
    }

    if (label.includes(LABEL_ANNOTATION)) {
      annotation = text || null;
    }
  });

  return { translation, annotation };
}

async function extractTranslationAnnotation(pageHtml: string, detailPath: string) {
  const $ = cheerio.load(pageHtml);
  const section = $(".sons")
    .filter((_index, element) => {
      const heading = $(element).find("h2 span").first().text().trim();
      return heading.startsWith(HEADING_TRANSLATION_ANNOTATION);
    })
    .first();

  if (section.length > 0) {
    const parsed = extractTranslationAnnotationFromHtml(section.html() ?? "");
    if (parsed.translation || parsed.annotation) {
      return parsed;
    }
  }

  const fanyiMatch = pageHtml.match(
    /fanyiShow\((\d+),'([^']+)','([^']+)'\)|fanyiShow\((\d+),'([^']+)'\)/,
  );
  const idStr = detailPath.match(/shiwenv_([a-f0-9]+)\.aspx/i)?.[1] ?? "";
  const ajaxId = fanyiMatch?.[1] ?? fanyiMatch?.[4] ?? null;
  const idjm = fanyiMatch?.[2] ?? fanyiMatch?.[5] ?? null;

  if (!ajaxId || !idjm || !idStr) {
    return {
      annotation: null,
      translation: null,
    };
  }

  const ajaxHtml = await fetchHtml(
    `${BASE_URL}/nocdn/ajaxfanyi.aspx?id=${ajaxId}&idjm=${idjm}&idStr=${idStr}`,
  );
  return extractTranslationAnnotationFromHtml(ajaxHtml);
}

async function extractPageContent(detailPath: string) {
  const pageHtml = await fetchHtml(`${BASE_URL}${detailPath}`);
  const $ = cheerio.load(pageHtml);

  const title = $("#sonsyuanwen h1").first().text().trim();
  const author = $("#sonsyuanwen p.source a").first().text().trim();
  const linesHtml = $("#sonsyuanwen .contson").first().html() ?? "";
  const lines = decodeText(linesHtml)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const { translation, annotation } = await extractTranslationAnnotation(pageHtml, detailPath);

  return {
    annotation,
    author,
    lines,
    title,
    translation,
  };
}

async function main() {
  const results: Array<{
    poetryId: string;
    title: string;
    author: string;
    created: boolean;
    hasTranslation: boolean;
    hasAnnotation: boolean;
  }> = [];

  for (const target of TARGETS) {
    const content = await extractPageContent(target.detailPath);

    if (target.mode === "update") {
      await db.poetry.update({
        where: { id: target.poetryId },
        data: {
          translation: content.translation,
          annotation: content.annotation,
        },
      });

      results.push({
        poetryId: target.poetryId,
        title: content.title,
        author: content.author,
        created: false,
        hasTranslation: Boolean(content.translation),
        hasAnnotation: Boolean(content.annotation),
      });
      continue;
    }

    await db.poetry.upsert({
      where: { id: target.poetryId },
      create: {
        id: target.poetryId,
        sourceId: null,
        sourceUid: target.detailPath.match(/shiwenv_([a-f0-9]+)\.aspx/i)?.[1] ?? target.poetryId,
        title: content.title,
        titleOriginal: content.title,
        titleZhHans: content.title,
        titleZhHant: content.title,
        author: content.author,
        authorOriginal: content.author,
        authorZhHans: content.author,
        authorZhHant: content.author,
        dynasty: DYNASTY_TANG,
        lines: content.lines,
        linesZhHans: content.lines,
        linesZhHant: content.lines,
        tags: [TAG_TS300, TAG_MANUAL],
        themes: [TAG_MANUAL],
        difficulty: 2,
        imageKey: target.imageKey,
        imageStatus: "placeholder",
        pinyin: content.lines.map(lineToPinyin),
        translation: content.translation,
        annotation: content.annotation,
      },
      update: {
        title: content.title,
        titleOriginal: content.title,
        titleZhHans: content.title,
        titleZhHant: content.title,
        author: content.author,
        authorOriginal: content.author,
        authorZhHans: content.author,
        authorZhHant: content.author,
        dynasty: DYNASTY_TANG,
        lines: content.lines,
        linesZhHans: content.lines,
        linesZhHant: content.lines,
        tags: [TAG_TS300, TAG_MANUAL],
        themes: [TAG_MANUAL],
        difficulty: 2,
        imageKey: target.imageKey,
        imageStatus: "placeholder",
        pinyin: content.lines.map(lineToPinyin),
        translation: content.translation,
        annotation: content.annotation,
      },
    });

    results.push({
      poetryId: target.poetryId,
      title: content.title,
      author: content.author,
      created: true,
      hasTranslation: Boolean(content.translation),
      hasAnnotation: Boolean(content.annotation),
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
