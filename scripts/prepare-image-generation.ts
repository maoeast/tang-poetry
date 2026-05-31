import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type NormalizedPoem = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  lines: string[];
  themes?: string[];
};

export type ImageAssetImportRecord = {
  poetryId: string;
  style: string;
  status: string;
  promptVersion: string;
  imagePath: string;
  thumbPath: string;
};

export type BatchJob = {
  name: string;
  prompt: string;
  size?: string;
  resolution?: string;
};

export type BatchJson = {
  defaults: {
    size: string;
    resolution: string;
  };
  jobs: BatchJob[];
};

type PoemImageryAnalysis = {
  sceneSummary: string;
  moodSummary: string;
  subjectSummary: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DOCS_DIR = path.join(process.cwd(), "docs");
const AIIMAGE_DIR = path.join(process.cwd(), "AIimage");
const POETRIES_PATH = path.join(DATA_DIR, "poetries.normalized.json");
const IMAGE_ASSETS_PATH = path.join(DATA_DIR, "image-assets.json");
const BATCH_TASK_PATH = path.join(AIIMAGE_DIR, "poetry-image-batch.json");
const MANIFEST_PATH = path.join(DOCS_DIR, "image-generation-manifest.md");
const PROMPT_GUIDE_PATH = path.join(DOCS_DIR, "poetry-image-prompt-guide.md");

const STYLE = "storybook-watercolor";
const PROMPT_VERSION = "v1";
const DEFAULT_IMAGE_PATH = "/images/placeholders/default-poetry-card.jpg";

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

export function loadPoems(raw: string): NormalizedPoem[] {
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("data/poetries.normalized.json must be an array");
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`poem at index ${index} must be an object`);
    }

    const candidate = item as Record<string, unknown>;

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.title !== "string" ||
      typeof candidate.author !== "string" ||
      typeof candidate.dynasty !== "string"
    ) {
      throw new Error(`poem at index ${index} is missing required fields`);
    }

    return {
      id: candidate.id,
      title: candidate.title,
      author: candidate.author,
      dynasty: candidate.dynasty,
      lines: toStringArray(candidate.lines),
      themes: toStringArray(candidate.themes),
    };
  });
}

function joinUnique(parts: string[]) {
  return Array.from(new Set(parts.filter((part) => part.trim().length > 0))).join("，");
}

function includesAny(text: string, candidates: string[]) {
  return candidates.some((candidate) => text.includes(candidate));
}

export function analyzePoemImagery(poem: NormalizedPoem): PoemImageryAnalysis {
  const text = `${poem.title} ${poem.author} ${(poem.themes ?? []).join(" ")} ${poem.lines.join(" ")}`;
  const sceneTags: string[] = [];
  const moodTags: string[] = [];
  const subjectTags: string[] = [];

  if (includesAny(text, ["春", "花", "晓", "柳", "燕", "鸟"])) {
    sceneTags.push("春晨庭院、花枝与微风");
    moodTags.push("清新、明亮、带一点惜春");
    subjectTags.push("窗边孩子、花枝、小鸟");
  }

  if (includesAny(text, ["月", "夜", "霜", "乡", "思"])) {
    sceneTags.push("静谧月夜、窗前清光");
    moodTags.push("安静、柔和、淡淡思乡");
    subjectTags.push("望月的孩子、窗棂、床前月色");
  }

  if (includesAny(text, ["山", "江", "河", "湖", "水", "舟"])) {
    sceneTags.push("远山、江水或湖岸的开阔景色");
    moodTags.push("清远、流动、富有空间感");
    subjectTags.push("小船、远山、岸边人物");
  }

  if (includesAny(text, ["塞", "关", "沙", "雪", "边", "征"])) {
    sceneTags.push("边塞高天、长风、沙地或雪原");
    moodTags.push("苍凉、壮阔、带克制张力");
    subjectTags.push("远行身影、关隘、旌旗或孤城");
  }

  if (includesAny(text, ["宫", "楼", "台", "阁"])) {
    sceneTags.push("古台阁、楼窗或宫苑建筑");
    moodTags.push("庄重、寂静、含历史感");
    subjectTags.push("楼台栏杆、远眺人物、空阔天空");
  }

  if (includesAny(text, ["愁", "怆", "悲", "泪", "伤"])) {
    moodTags.push("低回、克制、留有空白感");
  }

  if (includesAny(text, ["儿童", "游子", "故乡", "家"])) {
    subjectTags.push("儿童视角的陪伴感与家庭气息");
  }

  if (sceneTags.length === 0) {
    sceneTags.push("中国古典诗意场景");
  }

  if (moodTags.length === 0) {
    moodTags.push("宁静、温柔、适合儿童阅读");
  }

  if (subjectTags.length === 0) {
    subjectTags.push("一位儿童或小小观者与核心意象同框");
  }

  return {
    sceneSummary: joinUnique(sceneTags),
    moodSummary: joinUnique(moodTags),
    subjectSummary: joinUnique(subjectTags),
  };
}

export function buildPoetryImagePrompt(poem: NormalizedPoem) {
  const analysis = analyzePoemImagery(poem);
  const linesExcerpt = poem.lines.slice(0, 4).join(" ");
  const themeSummary = (poem.themes ?? []).slice(0, 4).join("、") || "古典诗意";

  return [
    "为儿童唐诗学习应用生成一张 2:3 竖版诗画海报插图。",
    "整体风格参考：温柔的中国绘本水彩、奶油色留白中心区、边缘植物或建筑框景、柔和发光感、低饱和配色、细腻纸张纹理。",
    `诗名：《${poem.title}》；作者：${poem.author}；朝代：${poem.dynasty}。`,
    `原诗参考：${linesExcerpt}。`,
    `主题关键词：${themeSummary}。`,
    `诗意场景：${analysis.sceneSummary}。`,
    `情绪氛围：${analysis.moodSummary}。`,
    `画面主体：${analysis.subjectSummary}。`,
    "画面要求：中心留出大面积干净浅色区域，便于后续排版题目与诗句；四周用花枝、窗棂、月色、山水、亭台或草木形成轻柔框景。",
    "人物要求：如出现人物，优先采用儿童化、小幅度、安静陪伴式角色，不要喧宾夺主，不要现代服饰。",
    "禁止项：不要出现文字、水印、拼音、诗句排版、书法字、UI 元素、边框、现代物件、照片写实感、强烈对称舞台感。",
  ].join("");
}

export function buildImageAssetRecord(poetryId: string): ImageAssetImportRecord {
  return {
    poetryId,
    style: STYLE,
    status: "placeholder",
    promptVersion: PROMPT_VERSION,
    imagePath: DEFAULT_IMAGE_PATH,
    thumbPath: DEFAULT_IMAGE_PATH,
  };
}

export function buildBatchJob(poem: NormalizedPoem): BatchJob {
  return {
    name: poem.id,
    prompt: buildPoetryImagePrompt(poem),
  };
}

export function buildManifest(poems: NormalizedPoem[]) {
  const lines = [
    "# 366 首诗图生成清单",
    "",
    `- 总诗数：${poems.length}`,
    `- 风格：${STYLE}`,
    `- promptVersion：${PROMPT_VERSION}`,
    "- 默认目标尺寸：2:3",
    "- 默认分辨率：2k",
    "",
    "## 首批示例",
    "",
    "| poetryId | 诗名 | 作者 | 主题 | 意境摘要 |",
    "|---|---|---|---|---|",
  ];

  for (const poem of poems.slice(0, 20)) {
    const analysis = analyzePoemImagery(poem);
    lines.push(
      `| ${poem.id} | ${poem.title} | ${poem.author} | ${(poem.themes ?? []).slice(0, 3).join(" / ")} | ${analysis.sceneSummary}；${analysis.moodSummary} |`,
    );
  }

  lines.push("", "## 产物位置", "");
  lines.push(`- 批量任务文件：\`AIimage/poetry-image-batch.json\``);
  lines.push(`- 图片导入草稿：\`data/image-assets.json\``);
  lines.push(`- Prompt 指南：\`docs/poetry-image-prompt-guide.md\``);

  return `${lines.join("\n")}\n`;
}

export function buildPromptGuide() {
  return `# 诗图 Prompt 归纳

## 参考图逆向分析

基于 \`AIimage/\` 下 3 张参考图，总结出的稳定视觉语言：

- 统一为 \`2:3\` 竖版儿童诗画海报
- 中心是大面积奶油色/暖白色留白区，方便后续叠加题目和诗句
- 四周用花枝、月亮、窗棂、荷叶、柳条、床榻等意象做轻柔框景
- 水彩纸纹理明显，颜色柔和、低饱和、带轻微发光感
- 场景不是单纯“风景图”，而是围绕诗意核心意象组织环境
- 常有小幅儿童角色作为陪伴式观看者，增强亲近感，但不抢主体

## Prompt 原则

- 先分析诗句里的场景，再分析情绪，再决定主体
- 不只写“水彩风”，必须显式写出：
  - 诗意场景
  - 情绪氛围
  - 画面主体
- 严禁在生成图中直接出现文字、拼音或书法
- 画面需要服务后续排版，因此中心留白必须稳定

## 默认参数

- style: \`${STYLE}\`
- promptVersion: \`${PROMPT_VERSION}\`
- size: \`2:3\`
- resolution: \`2k\`
`;
}

async function main() {
  const raw = await readFile(POETRIES_PATH, "utf8");
  const poems = loadPoems(raw);

  await mkdir(AIIMAGE_DIR, { recursive: true });
  await mkdir(DOCS_DIR, { recursive: true });

  const imageAssets = poems.map((poem) => buildImageAssetRecord(poem.id));
  const batchJson: BatchJson = {
    defaults: {
      size: "2:3",
      resolution: "2k",
    },
    jobs: poems.map(buildBatchJob),
  };

  await writeFile(IMAGE_ASSETS_PATH, `${JSON.stringify(imageAssets, null, 2)}\n`, "utf8");
  await writeFile(BATCH_TASK_PATH, `${JSON.stringify(batchJson, null, 2)}\n`, "utf8");
  await writeFile(MANIFEST_PATH, buildManifest(poems), "utf8");
  await writeFile(PROMPT_GUIDE_PATH, buildPromptGuide(), "utf8");

  console.log(
    JSON.stringify(
      {
        poetryCount: poems.length,
        imageAssetsPath: path.relative(process.cwd(), IMAGE_ASSETS_PATH),
        batchTaskPath: path.relative(process.cwd(), BATCH_TASK_PATH),
        manifestPath: path.relative(process.cwd(), MANIFEST_PATH),
        promptGuidePath: path.relative(process.cwd(), PROMPT_GUIDE_PATH),
      },
      null,
      2,
    ),
  );
}

const isDirectRun = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  : false;

if (isDirectRun) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
