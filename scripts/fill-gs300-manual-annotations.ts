import * as cheerio from "cheerio";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { PrismaClient } from "@prisma/client";

import {
  extractDetailPayload,
  parseTranslationAnnotation,
} from "@/lib/poetry/guwendao-annotation-import";

const prisma = new PrismaClient();
const execFileAsync = promisify(execFile);
const BASE_URL = "https://www.guwendao.net";

const TARGETS = [
  {
    poetryId: "gs300-0077",
    detailPath: "/shiwenv_863659d1c3b7.aspx",
  },
  {
    poetryId: "gs300-0078",
    detailPath: "/shiwenv_42ab3a41f32c.aspx",
  },
] as const;

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
    { maxBuffer: 10 * 1024 * 1024 },
  );

  return stdout;
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

async function fetchAjaxTranslation(detail: ReturnType<typeof extractDetailPayload>) {
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

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  try {
    const results = [];

    for (const target of TARGETS) {
      const pageHtml = await fetchHtml(`${BASE_URL}${target.detailPath}`);
      const detail = extractDetailPayload(pageHtml, target.detailPath);
      const inlineContent = extractInlineTranslationAnnotation(pageHtml);
      const remoteContent =
        !inlineContent.translation && !inlineContent.annotation
          ? await fetchAjaxTranslation(detail)
          : { annotation: null, translation: null };

      const translation = inlineContent.translation ?? remoteContent.translation;
      const annotation = inlineContent.annotation ?? remoteContent.annotation;

      results.push({
        poetryId: target.poetryId,
        pageTitle: detail.title,
        pageAuthor: detail.author,
        hasTranslation: Boolean(translation),
        hasAnnotation: Boolean(annotation),
      });

      if (!dryRun) {
        await prisma.poetry.update({
          where: { id: target.poetryId },
          data: {
            translation,
            annotation,
          },
        });
      }
    }

    console.log(JSON.stringify({ dryRun, results }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
