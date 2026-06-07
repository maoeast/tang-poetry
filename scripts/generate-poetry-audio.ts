/**
 * generate-poetry-audio.ts — Batch-generate emotionally expressive TTS audio
 * for classical Chinese poetry using StepFun stepaudio-2.5-tts.
 *
 * Two-phase pipeline:
 *   Phase 1: DeepSeek analyzes poem → voice, instruction, per-line emotion directives
 *   Phase 2: StepFun TTS generates audio with those parameters
 *
 * Usage:
 *   npx tsx scripts/generate-poetry-audio.ts                                # dry run
 *   npx tsx scripts/generate-poetry-audio.ts --write                        # generate
 *   npx tsx scripts/generate-poetry-audio.ts --write --source gs200 --limit 5
 *   npx tsx scripts/generate-poetry-audio.ts --write --id <uuid>
 *   npx tsx scripts/generate-poetry-audio.ts --write --analysis-only        # only DeepSeek
 *   npx tsx scripts/generate-poetry-audio.ts --write --skip-analysis        # use cached
 *   npx tsx scripts/generate-poetry-audio.ts --write --source sc200 --concurrency 5
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { loadEnvFiles } from "./lib/load-env.js";

loadEnvFiles();

// ─── Types ──────────────────────────────────────────────────────────

type RawPoem = {
  id: string;
  title: string;
  author: string;
  paragraphs: string[];
  tags?: string[];
};

type PoemAnalysis = {
  voice: string;
  instruction: string;
  annotatedLines: string[];
};

// ─── Constants ──────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "audio", "poetry");
const CACHE_PATH = path.join(DATA_DIR, "tts-analysis.json");

const STEP_BASE_URL =
  process.env.STEPFUN_BASE_URL ?? "https://api.stepfun.com/step_plan/v1";
const DEEPSEEK_BASE_URL =
  process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";

const MODEL_TTS = "stepaudio-2.5-tts";
const MODEL_DEEPSEEK = "deepseek-chat";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 30000;
const MAX_CHARS = 950;

const DEFAULT_VOICE = "cixingnansheng";
const DEFAULT_INSTRUCTION = "语气温和自然，节奏舒缓，适合朗诵古典诗词";

// ─── Dynasty mapping (from import-gs300.ts) ─────────────────────────

const SOURCE_DYNASTY: Record<string, string> = {
  ts300: "唐",
  sc200: "宋",
};

const AUTHOR_DYNASTY: Record<string, string> = {
  "夏商民歌": "先秦", "诗经": "先秦", "荆轲": "先秦", "项羽": "先秦",
  "刘邦": "两汉", "刘彻": "两汉", "李延年": "两汉",
  "古诗十九首": "两汉", "汉乐府民歌": "两汉", "佚名": "两汉",
  "曹操": "魏晋", "曹丕": "魏晋", "曹植": "魏晋", "王粲": "魏晋",
  "刘桢": "魏晋", "徐干": "魏晋", "嵇康": "魏晋", "阮籍": "魏晋",
  "左思": "魏晋", "张翰": "魏晋", "陶渊明": "魏晋", "吴隐之": "魏晋",
  "无名氏": "魏晋",
  "谢灵运": "南北朝", "鲍照": "南北朝", "谢朓": "南北朝", "沈约": "南北朝",
  "何逊": "南北朝", "吴均": "南北朝", "陶宏景": "南北朝", "王籍": "南北朝",
  "阴铿": "南北朝", "徐陵": "南北朝", "庾信": "南北朝", "萧纲": "南北朝",
  "陆凯": "南北朝", "范云": "南北朝", "释宝月": "南北朝", "刘昶": "南北朝",
  "江总": "南北朝", "薛道衡": "南北朝",
  "北朝民歌": "南北朝", "南朝民歌": "南北朝",
  "柳开": "宋", "郑文宝": "宋", "杨亿": "宋", "林逋": "宋",
  "寇准": "宋", "梅尧臣": "宋", "欧阳修": "宋", "苏舜钦": "宋",
  "王安石": "宋", "王禹偁": "宋", "刘攽": "宋", "王令": "宋",
  "岳飞": "宋", "宋祁": "宋", "曾公亮": "宋",
  "曾巩": "宋", "孔平仲": "宋", "张俞": "宋", "李觏": "宋",
  "程颢": "宋", "苏轼": "宋", "黄庭坚": "宋", "张舜民": "宋",
  "秦观": "宋", "道潜": "宋", "晁冲之": "宋", "陈师道": "宋",
  "徐俯": "宋", "吴涛": "宋", "吕本中": "宋", "汪藻": "宋",
  "刘子翚": "宋", "李清照": "宋", "李纲": "宋", "陆游": "宋",
  "范成大": "宋", "杨万里": "宋", "朱淑真": "宋", "曾几": "宋",
  "朱熹": "宋", "姜夔": "宋", "萧德藻": "宋", "林升": "宋",
  "张栻": "宋", "戴复古": "宋", "徐玑": "宋", "赵师秀": "宋",
  "翁卷": "宋", "叶绍翁": "宋", "戴敏": "宋", "曹豳": "宋",
  "志南": "宋", "文天祥": "宋", "杜耒": "宋", "卢钺": "宋",
  "谢枋得": "宋", "刘克庄": "宋", "陈与义": "宋", "张耒": "宋",
  "郑思肖": "宋", "南宋民歌": "宋",
  "元好问": "元", "王庭筠": "元", "陈孚": "元", "刘因": "元",
  "赵孟頫": "元", "黄庚": "元", "杨载": "元", "虞集": "元",
  "揭侯斯": "元", "王冕": "元", "徐元杰": "元", "萨都刺": "元",
  "高启": "明", "袁凯": "明", "杨基": "明", "王恭": "明",
  "杨士奇": "明", "毛铉": "明", "李昌祺": "明", "于谦": "明",
  "沈周": "明", "李东阳": "明", "唐寅": "明", "李梦阳": "明",
  "徐祯卿": "明", "边贡": "明", "何景明": "明", "杨慎": "明",
  "谢榛": "明", "李攀龙": "明", "杨继盛": "明", "徐渭": "明",
  "戚继光": "明", "文嘉": "明", "高攀龙": "明", "袁宏道": "明",
  "汤显祖": "明", "陈子龙": "明", "夏完淳": "明", "明朝民歌": "明",
  "吴伟业": "清", "尤侗": "清", "朱彝尊": "清", "王士祯": "清",
  "施闰章": "清", "沈德潜": "清", "纳兰性德": "清", "赵执信": "清",
  "厉鹗": "清", "屈复": "清", "蒋士铨": "清", "纪昀": "清",
  "袁枚": "清", "赵翼": "清", "姚鼐": "清", "高鼎": "清",
  "丘逢甲": "清", "谭嗣同": "清", "梁启超": "清", "秋瑾": "清",
  "章炳麟": "清", "查慎行": "清", "黄景仁": "清", "郑燮": "清",
  "龚自珍": "清",
};

// ─── Per-author TTS instructions (from generate-tts-audio.py) ───────

const AUTHOR_INSTRUCTIONS: Record<string, string> = {
  "李白": "语气豪放飘逸，意境开阔，带有浪漫主义色彩",
  "杜甫": "语气沉郁顿挫，忧国忧民，感情深沉",
  "白居易": "语气平易近人，叙事流畅，情感真挚",
  "王维": "语气恬淡闲远，诗中有画，意境空灵",
  "李商隐": "语气含蓄婉约，深情绵邈，朦胧幽美",
  "孟浩然": "语气清旷冲淡，自然随意，意境悠远",
  "岑参": "语气雄奇瑰丽，边塞壮阔，气势磅礴",
  "王昌龄": "语气雄浑豪迈，边塞慷慨，意气风发",
  "刘长卿": "语气凄婉含蓄，意境幽远，清雅脱俗",
  "韦应物": "语气闲淡清雅，自然质朴，情致悠然",
  "柳宗元": "语气孤寂清峭，意境幽深，冷峻孤傲",
  "杜牧": "语气俊朗清丽，含蓄隽永，兼有感伤",
  "元稹": "语气真挚深切，感情浓烈，哀婉动人",
  "孟郊": "语气峭刻深挚，苦吟风格，感情质朴",
  "卢纶": "语气刚健有力，边塞豪壮，节奏铿锵",
  "温庭筠": "语气绮丽浓艳，辞藻华美，婉约缠绵",
  "张九龄": "语气高雅端庄，含蓄蕴藉，风骨清峻",
  "宋之问": "语气清丽婉转，对仗工整，音韵和谐",
  "崔颢": "语气雄浑奔放，意境开阔，气势恢宏",
  "张祜": "语气清丽含蓄，宫廷韵味，婉转动听",
  "李颀": "语气豪放不羁，音乐性强，节奏鲜明",
  "杜审言": "语气清丽典雅，格律工整，意境清新",
  "王之涣": "语气雄浑豪迈，气象宏大，意境开阔",
  "钱起": "语气清丽雅致，意境空灵，含蓄蕴藉",
  "韦庄": "语气疏朗清丽，婉约含蓄，情致绵长",
  "祖咏": "语气清新自然，意境开阔，简洁凝练",
};

// ─── Per-poem overrides (from generate-tts-audio.py) ────────────────

const POEM_INSTRUCTIONS: Record<string, string> = {
  "0f7504df-cda2-4fe2-bc63-867ec2e418e7": "极度豪放纵情，气势磅礴，有醉态但不失诗人风骨",
  "0167687e-8325-48bf-8da4-3749c9ce0a74": "苍凉辽阔，边塞月色下的征人思乡之情",
  "d5da9d7d-1e52-4992-8be5-73e556b07e0b": "华丽典雅，赞美容貌，如春风牡丹般雍容",
  "59063901-7dbc-4f22-974f-ddccab675cbc": "华丽典雅，赞美娇艳，如露华浓般旖旎",
  "b5f1094b-b9be-43cf-8e04-9b984642a630": "华丽典雅，赞美容貌，如春风牡丹般雍容",
  "73dadc56-88ff-4f11-9ff5-da0e0adf533c": "华丽典雅，赞美娇艳，如露华浓般旖旎",
  "0db5450e-f1e0-4d53-8106-529def535537": "华丽典雅，名花倾国两相欢，雍容华贵",
  "948fa40a-492e-4fa1-99f4-b002ae87cd24": "华丽典雅，赞美容貌，如春风牡丹般雍容",
  "99167d13-8e2c-4b75-bf93-62b0682dfdd0": "华丽典雅，赞美娇艳，如露华浓般旖旎",
  "527eba4b-b35c-4d29-99e7-8f40c6f3d5b7": "由困惑愤懑到豁达振奋，先抑后扬，结尾充满信心",
  "801c3192-8001-4238-8ecf-0111f490e84c": "感慨人生多艰，大道如青天我独不得出，愤懑中带无奈",
  "a7b8e17f-ee93-4bdc-a144-b1ba5ab32bb5": "含蓄深沉，有耳莫洗颍川水之高洁，淡泊中有坚定",
  "e12edd83-36cd-4e8a-a630-91874631c51f": "感慨人生多艰，大道如青天我独不得出，愤懑中带无奈",
  "b4f9c5b3-0108-4127-bf3e-73fd207176f3": "含蓄深沉，有耳莫洗颍川水之高洁，淡泊中有坚定",
  "abb3e465-f10e-43dd-b564-a5de08010478": "夏日柔美，镜湖三百里如画，轻快明朗",
  "baccf46a-41c4-4a0f-b90f-37cc35b04a64": "秋日萧瑟中带温情，长安一片月万户捣衣声",
  "f990af2e-d929-48da-a9b3-fdbc706ca4a3": "冬夜清冷，明朝驿使发一夜絮征袍，急切深情",
  "4e92a96d-aa74-4153-8314-b6df22d1e18a": "春日明媚，秦地罗敷女采桑绿水边，清新欢快",
  "4bd5be2b-5788-42c0-a300-9d106a73d46e": "夏日热烈，镜湖三百里如画，明快开朗",
  "49194c4b-b775-4d21-a506-fc0a2ff308f1": "秋夜静谧，长安一片月万户捣衣声，温柔深情",
  "35319d7e-9cf6-43b0-bfa3-991cf82a49f9": "冬夜清寒，明朝驿使发一夜絮征袍，急切含情",
};

// ─── Available voices for poetry ────────────────────────────────────

const AVAILABLE_VOICES = [
  { id: "ruyananshi", label: "儒雅男士" },
  { id: "wenrounvsheng", label: "温柔女声" },
  { id: "linjiameimei", label: "邻家妹妹" },
  { id: "linjiajiejie", label: "邻家姐姐" },
  { id: "yuanqishaonv", label: "元气少女" },
  { id: "cixingnansheng", label: "磁性男声" },
  { id: "wenrougongzi", label: "温柔公子" },
  { id: "zhengpaiqingnian", label: "正派青年" },
  { id: "shenchennanyin", label: "深沉男音" },
  { id: "wenroushunv", label: "温柔熟女" },
  { id: "youyanvsheng", label: "优雅女声" },
  { id: "zhixingjiejie", label: "知性姐姐" },
] as const;

const VALID_VOICE_IDS = new Set(AVAILABLE_VOICES.map((v) => v.id));

// ─── DeepSeek system prompt ─────────────────────────────────────────

const VOICE_LIST_TEXT = AVAILABLE_VOICES.map((v) => `${v.id}（${v.label}）`).join("、");

const SYSTEM_PROMPT = `你是一位古典诗词朗诵导演。根据诗歌的内容、意境和情感，为 TTS 朗读设计最佳朗诵方案。

你需要返回 JSON 对象，包含以下字段：
- voice: 从给定的音色列表中选择最适合的一个音色 ID
- instruction: 全局语气描述，不超过200字，用于控制整首诗的朗读基调
- annotatedLines: 每行诗句前面加上情感控制指令，格式为：（情感描述）诗句原文

可用音色列表：${VOICE_LIST_TEXT}

要求：
1. voice 必须从上面的列表中选择一个 id
2. instruction 描述整体氛围，如"豪放飘逸、气势磅礴"或"恬淡闲远、如画中行"
3. annotatedLines 的每行前面用中文圆括号标注情感指令，如：（深情地，语速放慢）床前明月光
4. 情感指令应具体、有变化，体现诗歌的情感起伏
5. 不要改写诗句原文，只在前面加（）指令`;

// ─── CLI ────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const shouldWrite = args.includes("--write");
  const skipAnalysis = args.includes("--skip-analysis");
  const analysisOnly = args.includes("--analysis-only");

  let source: "ts300" | "gs300" | "sc200" | "all" = "all";
  const srcIdx = args.indexOf("--source");
  if (srcIdx !== -1 && args[srcIdx + 1]) {
    source = args[srcIdx + 1] as "ts300" | "gs300" | "sc200" | "all";
  }

  const rateLimitIdx = args.indexOf("--rate-limit");
  const rateLimitMs =
    rateLimitIdx !== -1 && args[rateLimitIdx + 1]
      ? parseInt(args[rateLimitIdx + 1], 10)
      : 500;

  const concurrencyIdx = args.indexOf("--concurrency");
  const concurrency =
    concurrencyIdx !== -1 && args[concurrencyIdx + 1]
      ? parseInt(args[concurrencyIdx + 1], 10)
      : 5;

  let id: string | null = null;
  const idIdx = args.indexOf("--id");
  if (idIdx !== -1 && args[idIdx + 1]) {
    id = args[idIdx + 1];
  }

  const limitIdx = args.indexOf("--limit");
  const limit =
    limitIdx !== -1 && args[limitIdx + 1]
      ? parseInt(args[limitIdx + 1], 10)
      : 0;

  return { shouldWrite, skipAnalysis, analysisOnly, source, rateLimitMs, concurrency, id, limit };
}

// ─── Helpers ────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBackoffDelay(attempt: number): number {
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
}

/** Run items concurrently with a pool limit. Returns results in original order. */
async function concurrentMap<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIdx = 0;

  async function worker(): Promise<void> {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function getDynasty(source: string, author: string): string {
  if (source === "gs300") {
    return AUTHOR_DYNASTY[author] ?? "其他";
  }
  return SOURCE_DYNASTY[source] ?? "唐";
}

/** Remove parenthetical variant notes like (何似 一作：何时；又恐 一作：惟 / 唯恐) */
function cleanPoemText(text: string): string {
  return text.replace(/[（(][^）)]*?[一又].*?[作：:][^）)]*[）)]/g, "").trim();
}

function audioFileExists(uuid: string): boolean {
  return existsSync(path.join(OUTPUT_DIR, `${uuid}.mp3`));
}

// ─── Poem loading ───────────────────────────────────────────────────

function loadPoems(source: string): { poem: RawPoem; source: string }[] {
  const files: [string, string][] = [];
  if (source === "all" || source === "ts300") files.push(["ts300", "ts300.simple.json"]);
  if (source === "all" || source === "gs300") files.push(["gs300", "gs300.simple.json"]);
  if (source === "all" || source === "sc200") files.push(["sc200", "sc200.simple.json"]);

  const result: { poem: RawPoem; source: string }[] = [];
  for (const [src, filename] of files) {
    const raw = JSON.parse(readFileSync(path.join(DATA_DIR, filename), "utf8")) as RawPoem[];
    for (const poem of raw) {
      result.push({ poem, source: src });
    }
  }
  return result;
}

// ─── Analysis cache ─────────────────────────────────────────────────

function loadAnalysisCache(): Record<string, PoemAnalysis> {
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveAnalysisCache(cache: Record<string, PoemAnalysis>): void {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
}

// ─── Phase 1: DeepSeek Analysis ─────────────────────────────────────

function buildAnalysisUserMessage(poem: RawPoem, dynasty: string): string {
  const cleanParagraphs = poem.paragraphs.map(cleanPoemText);
  let msg = `请为这首诗设计朗诵方案。\n\n`;
  msg += `题目：${poem.title}\n`;
  msg += `朝代：${dynasty}\n`;
  msg += `作者：${poem.author}\n`;
  msg += `原诗：\n${cleanParagraphs.join("\n")}`;

  const authorHint = AUTHOR_INSTRUCTIONS[poem.author];
  if (authorHint) {
    msg += `\n\n参考提示：这位作者的诗风特点是——${authorHint}`;
  }

  const poemHint = POEM_INSTRUCTIONS[poem.id];
  if (poemHint) {
    msg += `\n特别说明：${poemHint}`;
  }

  return msg;
}

function validateAnalysis(raw: unknown, paragraphs: string[]): PoemAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.voice !== "string" || !VALID_VOICE_IDS.has(obj.voice)) return null;
  if (typeof obj.instruction !== "string" || obj.instruction.length > 200) return null;
  if (!Array.isArray(obj.annotatedLines)) return null;

  const lines = obj.annotatedLines as string[];
  if (lines.length === 0) return null;

  // Verify the annotated lines contain the poem's core text content
  // DeepSeek may split long paragraphs into shorter lines
  const joinedAnnotated = lines.join("");
  const originalText = paragraphs.join("");
  // Check that a substantial portion of original text appears in the annotated output
  const overlap = [...originalText].filter((ch) => joinedAnnotated.includes(ch)).length;
  const ratio = overlap / originalText.length;
  if (ratio < 0.7) return null;

  return {
    voice: obj.voice,
    instruction: obj.instruction,
    annotatedLines: lines,
  };
}

function fallbackAnalysis(poem: RawPoem): PoemAnalysis {
  const authorInstr = AUTHOR_INSTRUCTIONS[poem.author];
  return {
    voice: DEFAULT_VOICE,
    instruction: authorInstr ?? DEFAULT_INSTRUCTION,
    annotatedLines: poem.paragraphs,
  };
}

async function analyzePoem(poem: RawPoem, dynasty: string, cleanParagraphs: string[]): Promise<PoemAnalysis> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY");

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL_DEEPSEEK,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildAnalysisUserMessage(poem, dynasty) },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`DeepSeek failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from DeepSeek");

  const parsed = JSON.parse(content) as unknown;
  const validated = validateAnalysis(parsed, cleanParagraphs);
  if (!validated) {
    console.warn("  Analysis validation failed, raw keys:", Object.keys(parsed as object));
    console.warn("  Raw voice:", (parsed as Record<string, unknown>).voice);
    console.warn("  Raw lines count:", (parsed as Record<string, unknown>).annotatedLines?.length, "expected:", cleanParagraphs.length);
    return fallbackAnalysis(poem);
  }
  return validated;
}

async function analyzeWithRetry(
  poem: RawPoem,
  dynasty: string,
  cleanParagraphs: string[],
): Promise<PoemAnalysis> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await analyzePoem(poem, dynasty, cleanParagraphs);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (attempt === MAX_RETRIES) {
        console.error(`  Analysis FAILED after ${MAX_RETRIES + 1} attempts: ${msg}`);
        return fallbackAnalysis(poem);
      }
      const delay = getBackoffDelay(attempt);
      console.warn(`  Analysis retry ${attempt + 1}/${MAX_RETRIES}: ${msg}`);
      await sleep(delay);
    }
  }
  return fallbackAnalysis(poem);
}

// ─── Phase 2: StepFun TTS ───────────────────────────────────────────

function buildTTSInput(poem: RawPoem, dynasty: string, analysis: PoemAnalysis): string {
  const header = `${poem.title}，${dynasty}代，${poem.author}。`;
  const content = analysis.annotatedLines.join("\n");
  const full = `${header}\n${content}`;
  return full.length > MAX_CHARS ? full.slice(0, MAX_CHARS) : full;
}

async function callStepFunTTS(
  text: string,
  voice: string,
  instruction: string,
): Promise<ArrayBuffer> {
  const apiKey = process.env.STEPFUN_API_KEY;
  if (!apiKey) throw new Error("Missing STEPFUN_API_KEY");

  const response = await fetch(`${STEP_BASE_URL}/audio/speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL_TTS,
      voice,
      input: text,
      response_format: "mp3",
      speed: 1.0,
      extra_body: { instruction },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`StepFun TTS failed (${response.status}): ${body.slice(0, 200)}`);
  }

  return response.arrayBuffer();
}

async function retryTTS(
  text: string,
  voice: string,
  instruction: string,
): Promise<ArrayBuffer | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callStepFunTTS(text, voice, instruction);
    } catch (error: unknown) {
      const isLast = attempt === MAX_RETRIES;
      const msg = error instanceof Error ? error.message : String(error);
      if (isLast) {
        console.error(`    TTS FAILED after ${MAX_RETRIES + 1} attempts: ${msg}`);
        return null;
      }
      const delay = getBackoffDelay(attempt);
      console.warn(`    TTS retry ${attempt + 1}/${MAX_RETRIES}: ${msg}`);
      await sleep(delay);
    }
  }
  return null;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();
  console.log("=== generate-poetry-audio: 开始 ===\n");

  if (!args.shouldWrite) {
    console.log("DRY RUN — use --write to generate files\n");
  }

  // 1. Load poems
  const allPoems = loadPoems(args.source);
  console.log(`Loaded ${allPoems.length} poems from data files (source: ${args.source})`);

  // 2. Filter: skip poems with existing audio
  const needAudio = allPoems.filter(({ poem }) => !audioFileExists(poem.id));
  console.log(`Already have audio: ${allPoems.length - needAudio.length}`);
  console.log(`Need audio: ${needAudio.length}`);

  // 3. Apply --id and --limit
  let workList = needAudio;
  if (args.id) {
    workList = workList.filter(({ poem }) => poem.id === args.id);
  }
  if (args.limit > 0) {
    workList = workList.slice(0, args.limit);
  }
  console.log(`Will process: ${workList.length}\n`);

  if (workList.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // 4. Ensure output dir
  if (args.shouldWrite) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 5. Load analysis cache
  const cache = loadAnalysisCache();
  const cachedCount = workList.filter(({ poem }) => cache[poem.id]).length;
  console.log(`Cached analyses: ${cachedCount}, Need analysis: ${workList.length - cachedCount}\n`);

  // ── Phase 1: DeepSeek Analysis (concurrent) ──
  if (!args.skipAnalysis) {
    console.log(`── Phase 1: DeepSeek Analysis (concurrency=${args.concurrency}) ──\n`);
    let analyzed = 0;
    let skipped = 0;
    const skippedCount = workList.filter(({ poem }) => cache[poem.id]).length;
    const toAnalyze = workList.filter(({ poem }) => !cache[poem.id]);

    await concurrentMap(toAnalyze, args.concurrency, async ({ poem, source }) => {
      const dynasty = getDynasty(source, poem.author);
      console.log(`Analyzing: ${poem.title} (${poem.author}, ${dynasty})`);

      const cleanParagraphs = poem.paragraphs.map(cleanPoemText);
      const analysis = await analyzeWithRetry(poem, dynasty, cleanParagraphs);
      cache[poem.id] = analysis;
      analyzed++;

      console.log(`  [${analyzed}/${toAnalyze.length}] voice: ${analysis.voice}, instruction: ${analysis.instruction.substring(0, 40)}...`);

      if (args.shouldWrite) {
        saveAnalysisCache(cache);
      }

      await sleep(args.rateLimitMs);
    });

    console.log(`\nPhase 1 done: ${analyzed} analyzed, ${skippedCount} cached`);
  } else {
    console.log("Skipping Phase 1 (using cached analysis)\n");
  }

  // ── Phase 2: StepFun TTS (concurrent) ──
  if (!args.analysisOnly) {
    console.log(`\n── Phase 2: StepFun TTS Generation (concurrency=${args.concurrency}) ──\n`);
    let generated = 0;
    let failed = 0;

    // Re-check which poems still need audio
    const toGenerate = workList.filter(({ poem }) => {
      if (audioFileExists(poem.id)) return false;
      if (!cache[poem.id]) return false;
      return true;
    });
    const noAnalysis = workList.filter(({ poem }) => !audioFileExists(poem.id) && !cache[poem.id]);
    const alreadyDone = workList.filter(({ poem }) => audioFileExists(poem.id));
    console.log(`Already have audio: ${alreadyDone.length}, No analysis: ${noAnalysis.length}, To generate: ${toGenerate.length}\n`);

    await concurrentMap(toGenerate, args.concurrency, async ({ poem, source }) => {
      const analysis = cache[poem.id]!;

      const dynasty = getDynasty(source, poem.author);
      const ttsInput = buildTTSInput(poem, dynasty, analysis);
      console.log(`Generating: ${poem.title} (${poem.author}) [${analysis.voice}]`);

      if (args.shouldWrite) {
        const audioBuffer = await retryTTS(ttsInput, analysis.voice, analysis.instruction);
        if (audioBuffer) {
          const outputPath = path.join(OUTPUT_DIR, `${poem.id}.mp3`);
          writeFileSync(outputPath, Buffer.from(audioBuffer));
          generated++;
          console.log(`  ✓ [${generated}/${toGenerate.length}] Saved: ${outputPath} (${audioBuffer.byteLength} bytes)`);
        } else {
          failed++;
        }
        await sleep(args.rateLimitMs);
      } else {
        console.log(`  [dry-run] Would generate with voice=${analysis.voice}`);
      }
    });

    console.log(`\nPhase 2 done: ${generated} generated, ${failed} failed, ${alreadyDone.length} skipped`);
  }

  // ── Summary ──
  console.log("\n=== generate-poetry-audio: 完成 ===");
  const totalAudio = existsSync(OUTPUT_DIR)
    ? require("node:fs").readdirSync(OUTPUT_DIR).filter((f: string) => f.endsWith(".mp3")).length
    : 0;
  console.log(`Total audio files on disk: ${totalAudio}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
