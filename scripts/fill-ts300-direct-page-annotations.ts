import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { PrismaClient } from "@prisma/client";

import { parseTranslationAnnotation } from "@/lib/poetry/guwendao-annotation-import";

const prisma = new PrismaClient();
const execFileAsync = promisify(execFile);

const TARGETS = [
  {
    poetryId: "ts300-0075",
    url: "https://www.guwendao.net/shiwenv_0cf45663f32a.aspx",
  },
  {
    poetryId: "ts300-0097",
    url: "https://www.guwendao.net/shiwenv_8da574e2c837.aspx",
  },
  {
    poetryId: "ts300-0154",
    url: "https://www.guwendao.net/shiwenv_8f7866739c12.aspx",
  },
  {
    poetryId: "ts300-0161",
    url: "https://www.guwendao.net/shiwenv_bea0a298570b.aspx",
  },
  {
    poetryId: "ts300-0281",
    url: "https://www.guwendao.net/shiwenv_8f424591685d.aspx",
  },
  {
    poetryId: "ts300-0309",
    url: "https://www.guwendao.net/shiwenv_4c7868ec4409.aspx",
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

function decodeHtmlToLines(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractFlexibleTranslationAnnotation(pageHtml: string) {
  const strict = parseTranslationAnnotation(pageHtml);
  if (strict.translation || strict.annotation) {
    return strict;
  }

  const sectionMatch = pageHtml.match(/译文及注释[\s\S]{0,8000}?(?=<div class="sons">[\s\S]*?<span style="float:left;font-size:18px;">创作背景|$)/);
  if (!sectionMatch) {
    return {
      annotation: null,
      translation: null,
    };
  }

  const lines = decodeHtmlToLines(sectionMatch[0]);
  let mode: "translation" | "annotation" | null = null;
  const translationLines: string[] = [];
  const annotationLines: string[] = [];

  for (const line of lines) {
    if (line === "译文" || line === "韵译" || line === "直译" || line === "散译") {
      mode = "translation";
      continue;
    }

    if (line === "注释" || line === "注解") {
      mode = "annotation";
      continue;
    }

    if (line === "译文及注释" || line === "展开阅读全文" || line === "完善") {
      continue;
    }

    if (mode === "translation") {
      translationLines.push(line);
      continue;
    }

    if (mode === "annotation") {
      annotationLines.push(line);
    }
  }

  return {
    translation: translationLines.length > 0 ? translationLines.join("\n") : null,
    annotation: annotationLines.length > 0 ? annotationLines.join("\n") : null,
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  try {
    const results = [];

    for (const target of TARGETS) {
      const html = await fetchHtml(target.url);
      const parsed = extractFlexibleTranslationAnnotation(html);

      results.push({
        poetryId: target.poetryId,
        hasTranslation: Boolean(parsed.translation),
        hasAnnotation: Boolean(parsed.annotation),
      });

      if (!dryRun) {
        await prisma.poetry.update({
          where: { id: target.poetryId },
          data: {
            translation: parsed.translation,
            annotation: parsed.annotation,
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
