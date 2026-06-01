import { mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
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

// ---- paths ----

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const DATA_DIR = path.join(process.cwd(), "data");
const DOCS_DIR = path.join(process.cwd(), "docs");
const AIIMAGES_DIR = path.join(process.cwd(), "AIimages");
const BATCHES_DIR = path.join(AIIMAGES_DIR, "batches");
const POETRIES_PATH = path.join(DATA_DIR, "poetries.normalized.json");
const IMAGE_ASSETS_PATH = path.join(DATA_DIR, "image-assets.json");
const MANIFEST_PATH = path.join(DOCS_DIR, "image-generation-manifest.md");
const PROMPT_GUIDE_PATH = path.join(DOCS_DIR, "poetry-image-prompt-guide.md");
const PROGRESS_PATH = path.join(BATCHES_DIR, ".personalized-progress.json");

const STYLE = "storybook-watercolor";
const PROMPT_VERSION = "v2";
const DEFAULT_IMAGE_PATH = "/images/placeholders/default-poetry-card.jpg";
const DEFAULT_BATCH_SIZE = 40;
const PREVIEW_POETRY_IDS = ["ts300-0001", "ts300-0002", "ts300-0004"] as const;

// ---- helpers ----

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

function includesAny(text: string, candidates: string[]) {
  return candidates.some((candidate) => text.includes(candidate));
}

function isPrisonCicadaPoem(poem: NormalizedPoem, text: string) {
  return poem.title.includes("在狱咏蝉") || includesAny(text, ["南冠客思侵", "来对白头吟"]);
}

// ---- mood detection (simplified fallback) ----

export function analyzePoemMood(poem: NormalizedPoem): string {
  const text = `${poem.title} ${poem.lines.join(" ")}`;

  if (isPrisonCicadaPoem(poem, text)) {
    return "克制、清冷、压抑中仍守高洁";
  }

  if (includesAny(text, ["将进酒", "黄河之水", "金樽", "尽欢", "千金散尽"])) {
    return "豪迈、纵情、开阔昂扬";
  }
  if (includesAny(text, ["蜀道", "难于上青天", "危乎高哉", "飞湍", "栈道"])) {
    return "惊险、雄奇、带敬畏感";
  }
  if (includesAny(text, ["边塞", "出塞", "从军", "征人", "玉门关", "万里长征", "胡马"])) {
    return "苍凉、壮阔、带克制张力";
  }
  if (includesAny(text, ["怆然", "涕下", "悲", "愁", "伤怀", "凄凉", "断肠"])) {
    return "低回、克制、留有空白感";
  }
  if (includesAny(text, ["思乡", "故乡", "归期", "静夜思", "明月", "月夜"])) {
    return "安静、柔和、带淡淡思乡";
  }
  if (includesAny(text, ["春", "花", "晓", "鸟", "啼", "燕", "柳"])) {
    return "清新、明快、温柔";
  }

  return "宁静、温柔、适合儿童阅读";
}

// ---- theme filter ----

const CURRICULAR_MARKERS = [
  /年级/,
  /上册/,
  /下册/,
  /课内/,
  /课外/,
  /初中/,
  /小学/,
  /・/,
  /^五言律诗$/,
  /^七言律诗$/,
  /^五言绝句$/,
  /^七言绝句$/,
  /^五言古诗$/,
  /^七言古诗$/,
  /^乐府$/,
  /^新乐府辞$/,
  /^古体$/,
  /^长诗$/,
];

export function filterThemes(themes: string[]): string[] {
  return themes.filter((t) => !CURRICULAR_MARKERS.some((p) => p.test(t)));
}

// ---- prompt builders ----

function buildSimplifiedPrompt(poem: NormalizedPoem): string {
  const mood = analyzePoemMood(poem);
  const themes = filterThemes(poem.themes ?? []);
  const themeSummary = themes.slice(0, 4).join("、") || "古典诗意";
  const excerpt = poem.lines.slice(0, 2).join(" ");

  return [
    "为儿童唐诗学习应用生成一张竖版诗画海报插图。",
    "整体风格：温柔的中国绘本水彩、柔和发光感、低饱和配色、细腻纸张纹理、适合家庭学习场景。",
    `诗名：${poem.title}。`,
    `作者：${poem.author}。`,
    `朝代：${poem.dynasty}。`,
    `诗句摘录：${excerpt}。`,
    `主题关键词：${themeSummary}。`,
    `情绪基调：${mood}。`,
    "画面要求：优先依据诗句自身意象理解与构图，不要套用固定边塞/春庭/月夜模板；保留适量留白但不强制固定中心留白区；人物如出现以儿童化、安静陪伴式角色为主，不穿现代服饰。",
    "禁止项：不要出现文字、水印、拼音、诗句排版、书法字、UI 元素、边框、现代物件、照片写实感、强烈对称舞台感。",
  ].join("");
}

function buildPersonalizedPrompt(poem: NormalizedPoem, sceneDescription: string): string {
  const themes = filterThemes(poem.themes ?? []);
  const themeSummary = themes.slice(0, 4).join("、") || "古典诗意";
  const excerpt = poem.lines.slice(0, 2).join(" ");

  return [
    "为儿童唐诗学习应用生成一张竖版诗画海报插图。",
    "整体风格：温柔的中国绘本水彩、柔和发光感、低饱和配色、细腻纸张纹理、适合家庭学习场景。",
    `诗名：${poem.title}。`,
    `作者：${poem.author}。`,
    `朝代：${poem.dynasty}。`,
    `诗句摘录：${excerpt}。`,
    `主题关键词：${themeSummary}。`,
    `诗意画面：${sceneDescription}。`,
    "画面要求：保留适量留白但不强制固定中心留白区；人物如出现以儿童化、安静陪伴式角色为主，不穿现代服饰。",
    "禁止项：不要出现文字、水印、拼音、诗句排版、书法字、UI 元素、边框、现代物件、照片写实感、强烈对称舞台感。",
  ].join("");
}

/**
 * Build a poetry image prompt.
 * When sceneDescription is provided (from DeepSeek personalization), uses the
 * high-quality personalized template. Otherwise falls back to simplified mood-based prompt.
 */
export function buildPoetryImagePrompt(poem: NormalizedPoem, sceneDescription?: string): string {
  if (sceneDescription) {
    return buildPersonalizedPrompt(poem, sceneDescription);
  }
  return buildSimplifiedPrompt(poem);
}

// ---- batch builders ----

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

export function buildBatchJob(poem: NormalizedPoem, sceneDescription?: string): BatchJob {
  return {
    name: poem.id,
    prompt: buildPoetryImagePrompt(poem, sceneDescription),
  };
}

export function buildBatchJson(jobs: BatchJob[]): BatchJson {
  return {
    defaults: {
      size: "2:3",
      resolution: "2k",
    },
    jobs,
  };
}

export function buildPreviewBatch(poems: NormalizedPoem[]) {
  const previewPoems = PREVIEW_POETRY_IDS.map((id) => {
    const poem = poems.find((candidate) => candidate.id === id);
    if (!poem) throw new Error(`preview poem not found: ${id}`);
    return poem;
  });

  return buildBatchJson(previewPoems.map((p) => buildBatchJob(p)));
}

export function buildFormalBatches(poems: NormalizedPoem[], batchSize = DEFAULT_BATCH_SIZE) {
  const batches: Array<{ filename: string; batch: BatchJson }> = [];

  for (let index = 0; index < poems.length; index += batchSize) {
    const batchNumber = String(Math.floor(index / batchSize) + 1).padStart(2, "0");
    const filename = `poetry-image-batch-${batchNumber}.json`;
    const batchPoems = poems.slice(index, index + batchSize);
    batches.push({
      filename,
      batch: buildBatchJson(batchPoems.map((p) => buildBatchJob(p))),
    });
  }

  return batches;
}

// ---- personalized progress ----

export async function loadPersonalizedProgress(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(PROGRESS_PATH, "utf8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

// ---- manifest & docs ----

export function buildManifest(poems: NormalizedPoem[]) {
  const formalBatches = buildFormalBatches(poems);
  const lines = [
    "# 366 首诗图生成清单",
    "",
    `- 总诗数：${poems.length}`,
    `- 风格：${STYLE}`,
    `- promptVersion：${PROMPT_VERSION}`,
    "- 默认目标尺寸：2:3",
    "- 默认分辨率：2k",
    `- Preview 审核批次：${PREVIEW_POETRY_IDS.join("、")}`,
    `- 正式批次数：${formalBatches.length}（每批 ${DEFAULT_BATCH_SIZE} 首，末批不足补齐）`,
    "",
    "## 首批示例",
    "",
    "| poetryId | 诗名 | 作者 | 主题 |",
    "|---|---|---|---|",
  ];

  for (const poem of poems.slice(0, 20)) {
    const themes = filterThemes(poem.themes ?? []);
    lines.push(
      `| ${poem.id} | ${poem.title} | ${poem.author} | ${themes.slice(0, 3).join(" / ")} |`,
    );
  }

  lines.push("", "## 产物位置", "");
  lines.push(`- Preview 批量任务：\`AIimages/batches/poetry-image-batch-01-preview.json\``);
  lines.push(`- 正式批量目录：\`AIimages/batches/\``);
  lines.push(`- 个性化进度缓存：\`AIimages/batches/.personalized-progress.json\``);
  lines.push(`- 图片导入草稿：\`data/image-assets.json\``);
  lines.push(`- Prompt 指南：\`docs/poetry-image-prompt-guide.md\``);

  return `${lines.join("\n")}\n`;
}

export function buildPromptGuide() {
  return `# 诗图 Prompt 归纳

## 当前视觉方向

当前批量出图遵循的稳定视觉语言：

- 统一为 \`2:3\` 竖版儿童诗画海报
- 使用温柔的中国绘本水彩与低饱和发光感
- 每首诗的画面由 DeepSeek 根据诗句意象单独生成，不使用固定模板
- 保留适量留白但不强制中心留白区
- 人物以儿童化、安静陪伴式角色为主

## Prompt 方案

主路径：DeepSeek 根据每首诗的具体意象（物、人、自然现象、场景）生成个性化画面描述，
套入统一的风格框架（水彩、低饱和、儿童化）。

个性化进度缓存在 \`AIimages/batches/.personalized-progress.json\`，
重新生成批次时自动读取，已完成的诗不会重复调用 API。

如果进度缓存不存在，使用简化的情绪基调方案作为兜底。

## 默认参数

- style: \`${STYLE}\`
- promptVersion: \`${PROMPT_VERSION}\`
- size: \`2:3\`
- resolution: \`2k\`
`;
}

// ---- runner ----

export async function runPrepareImageGeneration() {
  const raw = await readFile(POETRIES_PATH, "utf8");
  const poems = loadPoems(raw);

  await mkdir(AIIMAGES_DIR, { recursive: true });
  await mkdir(BATCHES_DIR, { recursive: true });
  await mkdir(DOCS_DIR, { recursive: true });

  // Load personalized progress (DeepSeek-generated scene descriptions)
  const progress = await loadPersonalizedProgress();
  const personalizedCount = Object.keys(progress).length;

  if (personalizedCount > 0) {
    console.log(`Using ${personalizedCount}/${poems.length} personalized scene descriptions.`);
  } else {
    console.log("No personalized progress found — using simplified mood-based prompts.");
    console.log("Run with --personalize to generate personalized prompts via DeepSeek.");
  }

  // Build jobs with personalized prompts where available
  const jobs: BatchJob[] = poems.map((poem) =>
    buildBatchJob(poem, progress[poem.id]),
  );

  // Preview batch
  const previewJobs = jobs.filter((j) => (PREVIEW_POETRY_IDS as readonly string[]).includes(j.name));
  const previewBatch = buildBatchJson(previewJobs);

  // Formal batches
  const batchCount = Math.ceil(jobs.length / DEFAULT_BATCH_SIZE);
  const formalBatches: Array<{ filename: string; batch: BatchJson }> = [];
  for (let i = 0; i < batchCount; i++) {
    const batchNum = String(i + 1).padStart(2, "0");
    formalBatches.push({
      filename: `poetry-image-batch-${batchNum}.json`,
      batch: buildBatchJson(jobs.slice(i * DEFAULT_BATCH_SIZE, (i + 1) * DEFAULT_BATCH_SIZE)),
    });
  }

  // Write artifacts
  const imageAssets = poems.map((poem) => buildImageAssetRecord(poem.id));

  await writeFile(IMAGE_ASSETS_PATH, `${JSON.stringify(imageAssets, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(BATCHES_DIR, "poetry-image-batch-01-preview.json"),
    `${JSON.stringify(previewBatch, null, 2)}\n`,
    "utf8",
  );
  await Promise.all(
    formalBatches.map(({ filename, batch }) =>
      writeFile(path.join(BATCHES_DIR, filename), `${JSON.stringify(batch, null, 2)}\n`, "utf8"),
    ),
  );
  await writeFile(MANIFEST_PATH, buildManifest(poems), "utf8");
  await writeFile(PROMPT_GUIDE_PATH, buildPromptGuide(), "utf8");

  console.log(
    JSON.stringify(
      {
        poetryCount: poems.length,
        personalizedCount,
        promptVersion: PROMPT_VERSION,
        imageAssetsPath: path.relative(process.cwd(), IMAGE_ASSETS_PATH),
        previewBatchPath: path.relative(
          process.cwd(),
          path.join(BATCHES_DIR, "poetry-image-batch-01-preview.json"),
        ),
        formalBatchDir: path.relative(process.cwd(), BATCHES_DIR),
        formalBatchCount: formalBatches.length,
        manifestPath: path.relative(process.cwd(), MANIFEST_PATH),
        promptGuidePath: path.relative(process.cwd(), PROMPT_GUIDE_PATH),
      },
      null,
      2,
    ),
  );
}

// ---- DeepSeek personalized prompt generation ----

type DeepSeekResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

function loadEnvFiles() {
  for (const envName of [".env", ".env.local"]) {
    try {
      const envPath = path.join(PROJECT_ROOT, envName);
      const envContent = readFileSync(envPath, "utf8");
      for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (envName === ".env.local" || !process.env[key]) {
          process.env[key] = value;
        }
      }
    } catch {
      // file not found, skip
    }
  }
}

const SCENE_SYSTEM_PROMPT = [
  "你是一位帮助儿童理解唐诗的视觉设计师。",
  "给定一首唐诗，为图像生成模型写一段中文画面描述（sceneDescription）。",
  "",
  "要求：",
  "1. 根据诗句中的具体意象来描述画面——景物、人物、自然现象、建筑、物件等",
  "2. 描述要具体可视化，让画家能直接照着画，不要抽象评价或文学赏析",
  "3. 适合儿童唐诗学习应用的绘本插画，画面温柔、亲近",
  "4. 自然融入中国古典元素，但不要套固定模板（不要每首都是花月窗景）",
  "5. 长度控制在 50-100 字",
  "6. 只返回 JSON：{\"sceneDescription\": \"...\"}",
  "",
  "示例：",
  "输入：春晓（孟浩然）\"春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。\"",
  "输出：{\"sceneDescription\": \"春日清晨，庭院花树枝头绽放，花瓣零星飘落青石地。几只小鸟在枝头张嘴啼鸣。晨光微熹透过窗棂，地面散落被夜雨打落的花瓣。\"}",
].join("\n");

async function callDeepSeek(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";

  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`DeepSeek API ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as DeepSeekResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error("DeepSeek returned empty content");

  return content;
}

async function generateOneScene(poem: NormalizedPoem): Promise<string> {
  const userPrompt = [
    `诗名：${poem.title}`,
    `作者：${poem.author}`,
    `朝代：${poem.dynasty}`,
    "诗句：",
    ...poem.lines,
  ].join("\n");

  const MAX_RETRIES = 3;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const content = await callDeepSeek(SCENE_SYSTEM_PROMPT, userPrompt);
      const parsed = JSON.parse(content) as Record<string, unknown>;

      if (typeof parsed.sceneDescription === "string" && parsed.sceneDescription.trim().length > 0) {
        return parsed.sceneDescription.trim();
      }

      throw new Error("Invalid sceneDescription in response");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error("Failed to generate scene description");
}

export interface PersonalizeOptions {
  /** Max concurrent API calls (default 5) */
  concurrency?: number;
  /** Delay between batches in ms (default 300) */
  delayMs?: number;
  /** Only process these poetry IDs (default: all pending) */
  poetryIds?: string[];
}

/**
 * Generate personalized scene descriptions via DeepSeek for poems that don't yet have them.
 * Progress is saved to AIimages/batches/.personalized-progress.json after each poem.
 * Safe to interrupt and resume — completed poems are skipped.
 */
export async function generatePersonalizedScenes(
  poems: NormalizedPoem[],
  options: PersonalizeOptions = {},
): Promise<Record<string, string>> {
  loadEnvFiles();

  const { concurrency = 5, delayMs = 300, poetryIds } = options;

  await mkdir(BATCHES_DIR, { recursive: true });
  let progress = await loadPersonalizedProgress();

  const targetPoems = poetryIds
    ? poems.filter((p) => poetryIds.includes(p.id) && !progress[p.id])
    : poems.filter((p) => !progress[p.id]);

  if (targetPoems.length === 0) {
    console.log("All poems already personalized.");
    return progress;
  }

  console.log(
    `Generating personalized scenes: ${Object.keys(progress).length} done, ${targetPoems.length} pending.`,
  );

  const startTime = Date.now();
  let completed = 0;
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < targetPoems.length) {
      const index = nextIndex++;
      const poem = targetPoems[index]!;
      try {
        const desc = await generateOneScene(poem);
        progress[poem.id] = desc;
        await writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2), "utf8");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed ${poem.id} "${poem.title}": ${message}`);
      }
      completed++;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const total = Object.keys(progress).length;
      console.log(`[${elapsed}s] ${total}/${poems.length} — ${poem.title}`);
      if (nextIndex < targetPoems.length) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, targetPoems.length) }, () => worker());
  await Promise.all(workers);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`\nPersonalization done in ${totalTime}s. ${Object.keys(progress).length}/${poems.length} completed.`);

  return progress;
}

// ---- cli ----

const isDirectRun = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  : false;

if (isDirectRun) {
  const shouldPersonalize = process.argv.includes("--personalize");

  void (async () => {
    if (shouldPersonalize) {
      console.log("--personalize flag set — generating personalized scene descriptions via DeepSeek.\n");
      const raw = await readFile(POETRIES_PATH, "utf8");
      const poems = loadPoems(raw);
      await generatePersonalizedScenes(poems);
      console.log("\nNow building batch JSONs...\n");
    }

    await runPrepareImageGeneration();
  })().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
