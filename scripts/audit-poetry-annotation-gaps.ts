import { writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type GapEntry = {
  id: string;
  title: string;
  author: string;
};

type Bucket = {
  total: number;
  withTranslation: number;
  withAnnotation: number;
  missingTranslation: GapEntry[];
  missingAnnotation: GapEntry[];
  onlyTranslation: GapEntry[];
  onlyAnnotation: GapEntry[];
};

const PRIORITY_NOTES: Record<string, string[]> = {
  gs300: [
    "优先关注《诗经》组（gs300-0002 至 gs300-0011），当前公开页大概率不返回译文注释。",
    "其次处理 onlyTranslation / onlyAnnotation 条目，说明页面存在部分内容但未完整落库。",
  ],
  sc200: [
    "sc200 剩余缺口已确认主要为古文岛公开页无译文/注释块，继续自动抓取收益低。",
    "优先记录为公开源缺失，后续如需补齐建议改走其他来源或人工补录。",
  ],
  ts300: [
    "ts300 主要剩余长尾缺口，不再是大面积错位问题。",
    "优先处理 onlyTranslation / onlyAnnotation 条目，再决定是否补齐大量儿童诗尾项。",
  ],
};

function toMarkdownSection(title: string, items: GapEntry[]) {
  if (items.length === 0) {
    return `## ${title}\n\n- 无\n`;
  }

  return [
    `## ${title}`,
    "",
    ...items.map((item) => `- \`${item.id}\` ${item.author}《${item.title}》`),
    "",
  ].join("\n");
}

async function main() {
  const projectRoot = process.cwd();
  const reportPath = path.join(projectRoot, "docs", "annotation-gap-report.md");

  try {
    const rows = await prisma.poetry.findMany({
      select: {
        id: true,
        title: true,
        author: true,
        translation: true,
        annotation: true,
      },
      orderBy: { id: "asc" },
    });

    const grouped = new Map<string, Bucket>();

    for (const row of rows) {
      const source = row.id.split("-")[0] ?? "unknown";
      const bucket = grouped.get(source) ?? {
        total: 0,
        withTranslation: 0,
        withAnnotation: 0,
        missingTranslation: [],
        missingAnnotation: [],
        onlyTranslation: [],
        onlyAnnotation: [],
      };

      const entry: GapEntry = {
        id: row.id,
        title: row.title,
        author: row.author,
      };

      bucket.total += 1;

      if (row.translation) {
        bucket.withTranslation += 1;
      } else {
        bucket.missingTranslation.push(entry);
      }

      if (row.annotation) {
        bucket.withAnnotation += 1;
      } else {
        bucket.missingAnnotation.push(entry);
      }

      if (row.translation && !row.annotation) {
        bucket.onlyTranslation.push(entry);
      }

      if (!row.translation && row.annotation) {
        bucket.onlyAnnotation.push(entry);
      }

      grouped.set(source, bucket);
    }

    const jsonReport = Object.fromEntries(grouped.entries());

    const markdown = [
      "# 译文与注释缺口报告",
      "",
      `生成时间：${new Date().toISOString()}`,
      "",
      ...[...grouped.entries()].flatMap(([source, bucket]) => [
        `# ${source}`,
        "",
        `- 总数：${bucket.total}`,
        `- 有译文：${bucket.withTranslation}`,
        `- 有注释：${bucket.withAnnotation}`,
        `- 缺译文：${bucket.missingTranslation.length}`,
        `- 缺注释：${bucket.missingAnnotation.length}`,
        `- 只有译文：${bucket.onlyTranslation.length}`,
        `- 只有注释：${bucket.onlyAnnotation.length}`,
        "",
        ...(PRIORITY_NOTES[source] ?? []).flatMap((note) => [`- 处理建议：${note}`]),
        "",
        toMarkdownSection(`${source} 缺译文`, bucket.missingTranslation),
        toMarkdownSection(`${source} 缺注释`, bucket.missingAnnotation),
        toMarkdownSection(`${source} 只有译文`, bucket.onlyTranslation),
        toMarkdownSection(`${source} 只有注释`, bucket.onlyAnnotation),
      ]),
    ].join("\n");

    await writeFile(reportPath, `${markdown}\n`, "utf8");

    console.log(
      JSON.stringify(
        {
          reportPath,
          summary: jsonReport,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
