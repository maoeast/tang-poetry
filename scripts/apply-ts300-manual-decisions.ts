import * as cheerio from "cheerio";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { PrismaClient } from "@prisma/client";
import { pinyin } from "pinyin-pro";

import {
  extractDetailPayload,
  parseTranslationAnnotation,
} from "@/lib/poetry/guwendao-annotation-import";

const prisma = new PrismaClient();
const execFileAsync = promisify(execFile);
const BASE_URL = "https://www.guwendao.net";
const TAG_TS300 = "唐诗三百首";
const THEME_MANUAL = "人工校正";

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

function extractInlineTranslationAnnotation(html: string) {
  const $ = cheerio.load(html);
  const section = $(".sons")
    .filter((_index, element) => {
      const heading = $(element).find("h2 span").first().text().trim();
      return heading === "译文及注释";
    })
    .first();

  if (section.length === 0) {
    return {
      annotation: null,
      translation: null,
    };
  }

  return parseTranslationAnnotation(section.html() ?? "");
}

async function fetchAjaxTranslation(detail: ReturnType<typeof extractDetailPayload> extends infer T ? T : never) {
  if (!detail || typeof detail !== "object" || !("ajaxId" in detail) || !("idjm" in detail) || !("idStr" in detail)) {
    return {
      annotation: null,
      translation: null,
    };
  }

  if (!detail.ajaxId || !detail.idjm) {
    return {
      annotation: null,
      translation: null,
    };
  }

  try {
    const html = await fetchHtml(
      `${BASE_URL}/nocdn/ajaxfanyi.aspx?id=${detail.ajaxId}&idjm=${detail.idjm}&idStr=${detail.idStr}`,
    );
    return parseTranslationAnnotation(html);
  } catch {
    return {
      annotation: null,
      translation: null,
    };
  }
}

async function fetchPageContent(detailPath: string) {
  const pageHtml = await fetchHtml(`${BASE_URL}${detailPath}`);
  const detail = extractDetailPayload(pageHtml, detailPath);
  const inlineContent = extractInlineTranslationAnnotation(pageHtml);
  const remoteContent =
    !inlineContent.translation && !inlineContent.annotation
      ? await fetchAjaxTranslation(detail)
      : { annotation: null, translation: null };

  return {
    detail,
    title: detail.title,
    author: detail.author,
    lines: detail.lines,
    translation: inlineContent.translation ?? remoteContent.translation,
    annotation: inlineContent.annotation ?? remoteContent.annotation,
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const updates = [
    {
      id: "ts300-0319",
      nextTitle: "送李端",
      nextAuthor: "卢纶",
      nextSourceUid: "fdae6ac54db6",
    },
    {
      id: "ts300-0026",
      nextTitle: "无题·凤尾香罗薄几重",
      nextAuthor: "李商隐",
      nextSourceUid: "2d27cb0ecae4",
    },
    {
      id: "ts300-0045",
      nextTitle: "杂诗·近寒食雨草萋萋",
      nextAuthor: "佚名",
      nextSourceUid: "4508caf3b53b",
    },
  ] as const;

  const creations = [
    {
      id: "ts300-0360",
      detailPath: "/shiwenv_24dacc9084c8.aspx",
      title: "寄扬州韩绰判官",
      author: "杜牧",
    },
    {
      id: "ts300-0361",
      detailPath: "/shiwenv_e2890c61279c.aspx",
      title: "题破山寺后禅院",
      author: "常建",
    },
  ] as const;

  const fetched = await Promise.all(
    creations.map(async (item) => ({
      ...item,
      ...(await fetchPageContent(item.detailPath)),
    })),
  );

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          updates,
          creations: fetched.map((item) => ({
            id: item.id,
            title: item.title,
            author: item.author,
            lineCount: item.lines.length,
            hasTranslation: Boolean(item.translation),
            hasAnnotation: Boolean(item.annotation),
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  for (const update of updates) {
    await prisma.poetry.update({
      where: { id: update.id },
      data: {
        sourceUid: update.nextSourceUid,
        title: update.nextTitle,
        titleOriginal: update.nextTitle,
        titleZhHans: update.nextTitle,
        titleZhHant: update.nextTitle,
        author: update.nextAuthor,
        authorOriginal: update.nextAuthor,
        authorZhHans: update.nextAuthor,
        authorZhHant: update.nextAuthor,
      },
    });
  }

  for (const item of fetched) {
    await prisma.poetry.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        sourceId: null,
        sourceUid: item.detail.idStr,
        title: item.title,
        titleOriginal: item.title,
        titleZhHans: item.title,
        titleZhHant: item.title,
        author: item.author,
        authorOriginal: item.author,
        authorZhHans: item.author,
        authorZhHant: item.author,
        dynasty: "唐",
        lines: item.lines,
        linesZhHans: item.lines,
        linesZhHant: item.lines,
        tags: [TAG_TS300],
        themes: [THEME_MANUAL],
        difficulty: 2,
        imageKey: item.id,
        imageStatus: "placeholder",
        pinyin: item.lines.map(lineToPinyin),
        translation: item.translation,
        annotation: item.annotation,
      },
      update: {
        sourceUid: item.detail.idStr,
        title: item.title,
        titleOriginal: item.title,
        titleZhHans: item.title,
        titleZhHant: item.title,
        author: item.author,
        authorOriginal: item.author,
        authorZhHans: item.author,
        authorZhHant: item.author,
        dynasty: "唐",
        lines: item.lines,
        linesZhHans: item.lines,
        linesZhHant: item.lines,
        tags: [TAG_TS300],
        themes: [THEME_MANUAL],
        difficulty: 2,
        imageKey: item.id,
        imageStatus: "placeholder",
        pinyin: item.lines.map(lineToPinyin),
        translation: item.translation,
        annotation: item.annotation,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        dryRun: false,
        updated: updates.map((item) => item.id),
        created: fetched.map((item) => ({
          id: item.id,
          title: item.title,
          author: item.author,
        })),
      },
      null,
      2,
    ),
  );
}

void main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
