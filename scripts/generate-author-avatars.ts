import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const DATA_DIR = path.join(PROJECT_ROOT, "data");
const AIIMAGES_DIR = path.join(PROJECT_ROOT, "AIimages");
const BATCHES_DIR = path.join(AIIMAGES_DIR, "batches");
const AUTHORS_PATH = path.join(DATA_DIR, "authors.json");
const PROGRESS_PATH = path.join(AIIMAGES_DIR, ".author-avatar-progress.json");
const BATCH_OUT_PATH = path.join(BATCHES_DIR, "author-avatar-batch.json");

// ---- types ----

type Author = {
  name: string;
  nameZhHant?: string;
  avatarUrl?: string;
  dynasty: string;
  courtesyName?: string | null;
  literaryName?: string | null;
  bio?: string;
  lifeStory?: string;
};

type ProgressRecord = {
  prompt: string;
  dynasty: string;
  headwear: string;
};

// ---- helpers ----

function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const content = require("node:fs").readFileSync(path.join(PROJECT_ROOT, file), "utf8");
      for (const line of content.split("\n")) {
        const [key, ...rest] = line.split("=");
        if (key && rest.length > 0 && !process.env[key]) {
          process.env[key] = rest.join("=").trim();
        }
      }
    } catch {
      // ignore
    }
  }
}

async function loadAuthors(): Promise<Author[]> {
  const raw = await readFile(AUTHORS_PATH, "utf8");
  return JSON.parse(raw);
}

async function loadProgress(): Promise<Record<string, ProgressRecord>> {
  try {
    const raw = await readFile(PROGRESS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveProgress(progress: Record<string, ProgressRecord>) {
  await writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2), "utf8");
}

function fileExists(targetPath: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("node:fs").accessSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

function hasAvatar(author: Author): boolean {
  if (!author.avatarUrl) return false;
  const filename = author.avatarUrl.replace("/images/authors/", "");
  return fileExists(path.join(PROJECT_ROOT, "public", "images", "authors", filename));
}

// ---- DeepSeek prompt generation ----

const SYSTEM_PROMPT = `你是一位中国古代服饰史与肖像画专家。你的任务是为一位中国古代诗人/文人生成一段用于AI图像生成的英文肖像描述（prompt）。

核心要求：
1. 根据诗人所处朝代选择符合历史时期的真实装束，**绝对禁止所有朝代都用“幞头”**
2. 不同朝代的典型头饰参考：
   - 先秦/汉：冠（如通天冠、进贤冠）、束发髻、深衣
   - 魏晋：幅巾、纶巾、高髻、宽袖褒衣、麈尾
   - 南北朝：笼冠、鲜卑帽、宽袍大袖（南北风格可略有差异）
   - 唐：幞头（软脚/硬脚）、圆领袍、 BUT NOT EVERYONE — 隐士用幅巾，僧人用僧帽
   - 宋：东坡巾、方巾、幞头、直裰
   - 元：笠帽、暖帽、质孙服元素
   - 明：网巾、方巾、唐巾、道袍
   - 清：瓜皮帽、长辫、马褂（满族），或方巾、长衫（汉族文人）
   - 女性诗人：对应朝代的发髻、钗簪、襦裙/衫裙
3. 结合诗人的生平性格调整面容与神态：
   - 豪放派：眉目舒展、神情昂扬、可能带须髯
   - 婉约派：面容清秀、神情含蓄
   - 边塞诗人：面容刚毅、肤色略深、可能带风尘感
   - 隐士/道士：清瘦、超然、可能持杖或持卷
   - 帝王：威严、华贵
   - 女性：温婉或英气，依人物而定
4. 描述结构：
   - 画种：classical Chinese ink and wash portrait (水墨工笔人物画)
   - 构图：bust portrait / three-quarter view / seated figure
   - 面容：具体年龄感、胡须有无、神情
   - 头饰：具体的朝代特征头饰（不要泛泛说"traditional hat"）
   - 服饰：具体的朝代特征服装
   - 手持物或背景元素：书卷、酒杯、剑、琴、竹、松等，与诗人气质相符
5. 风格：museum-quality traditional Chinese portrait, fine brushwork, warm harmonious tones, gentle ink gradations
6. 禁止：不要出现文字、印章、书法、calligraphy、seals、red chop marks
7. 输出格式：只返回一段英文prompt，不要有额外说明

输出必须是一段可以直接用于图像生成模型的英文prompt，不要中文解释。`;

async function callDeepSeek(userPrompt: string): Promise<string> {
  const apiKey = (process.env.DEEPSEEK_API_KEY ?? "").replace(/^["']|["']$/g, "");
  const baseUrl = (process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com")
    .replace(/^["']|["']$/g, "")
    .replace(/\/$/, "");
  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`DeepSeek ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) throw new Error("Empty DeepSeek response");
  return content;
}

function buildUserPrompt(author: Author): string {
  const parts = [
    `诗人姓名：${author.name}`,
    `朝代：${author.dynasty}`,
  ];
  if (author.courtesyName) parts.push(`字：${author.courtesyName}`);
  if (author.literaryName) parts.push(`号：${author.literaryName}`);
  if (author.bio) parts.push(`简介：${author.bio.slice(0, 300)}`);
  if (author.lifeStory) {
    const firstPara = author.lifeStory.split("▲")[0]?.slice(0, 400) ?? "";
    if (firstPara) parts.push(`生平片段：${firstPara}`);
  }
  return parts.join("\n");
}

// ---- batch building ----

function buildBatchJson(jobs: Array<{ name: string; prompt: string }>) {
  return {
    defaults: {
      size: "1:1",
      resolution: "1k",
      model: "gpt-image-2",
    },
    jobs: jobs.map((j) => ({
      name: j.name,
      prompt: j.prompt,
    })),
  };
}

// ---- main ----

async function main() {
  loadEnvFiles();

  const personalizeOnly = process.argv.includes("--personalize-only");
  const batchOnly = process.argv.includes("--batch-only");
  const dryRun = process.argv.includes("--dry-run");

  const authors = await loadAuthors();
  const missingAuthors = authors.filter((a) => !hasAvatar(a));

  console.log(`Authors: ${authors.length}, Missing avatars: ${missingAuthors.length}`);

  if (missingAuthors.length === 0) {
    console.log("All authors have avatars.");
    return;
  }

  const progress = await loadProgress();

  if (!batchOnly) {
    // Generate personalized prompts via DeepSeek
    const pending = missingAuthors.filter((a) => !progress[a.name]);
    console.log(`\nGenerating personalized prompts for ${pending.length} authors...`);

    let done = 0;
    for (const author of pending) {
      try {
        const userPrompt = buildUserPrompt(author);
        const prompt = await callDeepSeek(userPrompt);

        // Extract headwear for diversity tracking
        const headwearMatch = prompt.match(/(\w+\s+(?:cap|hat|scarf|turban|crown|bun|headwear|headpiece|hairpin|headdress|巾|冠|帽|幞|髻|簪))/i);
        const headwear = headwearMatch ? headwearMatch[1] : "unknown";

        progress[author.name] = {
          prompt,
          dynasty: author.dynasty,
          headwear,
        };
        await saveProgress(progress);
        done++;
        console.log(`[${done}/${pending.length}] ${author.name} (${author.dynasty}) — ${headwear}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed ${author.name}: ${msg}`);
      }
    }
  }

  // Build batch JSON
  const jobs: Array<{ name: string; prompt: string }> = [];
  for (const author of missingAuthors) {
    const record = progress[author.name];
    if (!record) {
      console.warn(`No prompt for ${author.name}, skipping`);
      continue;
    }
    // Convert author name to safe filename (pinyin-like or just romanized)
    // Use existing avatarUrl basename if available, else derive from name
    let basename: string;
    if (author.avatarUrl) {
      basename = author.avatarUrl.replace("/images/authors/", "").replace(/\.jpg$/, "");
    } else {
      // Use a simple romanization fallback
      basename = author.name
        .toLowerCase()
        .replace(/[\u4e00-\u9fa5]/g, (ch) => {
          // Simple pinyin-ish mapping for common surnames
          const map: Record<string, string> = {
            夏: "xia", 商: "shang", 诗: "shi", 刘: "liu", 李: "li", 汉: "han",
            古: "gu", 曹: "cao", 王: "wang", 谢: "xie", 鲍: "bao", 陆: "lu",
            范: "fan", 释: "shi", 沈: "shen", 何: "he", 吴: "wu", 陶: "tao",
            萧: "xiao", 阴: "yin", 徐: "xu", 刘昶: "liuchang", 庾: "yu",
            江: "jiang", 薛: "xue", 孔: "kong", 柳: "liu", 郑: "zheng",
            曾: "zeng", 戴: "dai", 元: "yuan", 揭: "jie", 萨: "sa", 明: "ming",
            冯: "feng", 汤: "tang", 叶: "ye", 淮: "huai", 黄: "huang",
            韩: "han", 蜀: "shu", 许: "xu", 蒋: "jiang", 郑文妻: "zhengwenqi",
            赵: "zhao", 鲁: "lu", 洪: "hong", 陈: "chen", 华: "hua",
            阮: "ruan", 连: "lian", 周: "zhou", 金: "jin", 岳: "yue",
            袁: "yuan", 梁: "liang", 秋: "qiu", 章: "zhang",
          };
          return map[ch] || "x";
        })
        .replace(/[^a-z0-9]/g, "");
    }
    jobs.push({ name: basename, prompt: record.prompt });
  }

  if (jobs.length === 0) {
    console.log("No jobs to submit.");
    return;
  }

  await mkdir(BATCHES_DIR, { recursive: true });
  const batch = buildBatchJson(jobs);
  await writeFile(BATCH_OUT_PATH, `${JSON.stringify(batch, null, 2)}\n`, "utf8");

  console.log(`\nWrote batch: ${BATCH_OUT_PATH} (${jobs.length} jobs)`);

  // Diversity report
  const headwearCounts: Record<string, number> = {};
  for (const author of missingAuthors) {
    const record = progress[author.name];
    if (record) {
      headwearCounts[record.headwear] = (headwearCounts[record.headwear] || 0) + 1;
    }
  }
  console.log("\nHeadwear diversity:");
  for (const [hw, count] of Object.entries(headwearCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${hw}: ${count}`);
  }

  if (dryRun) {
    console.log("\n--dry-run: sample prompts:");
    for (const job of jobs.slice(0, 3)) {
      console.log(`\n${job.name}:\n${job.prompt.slice(0, 300)}...`);
    }
  }

  if (personalizeOnly) {
    console.log("\n--personalize-only: batch written but not submitted.");
    return;
  }

  console.log("\nNext: submit the batch via apimart.");
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
