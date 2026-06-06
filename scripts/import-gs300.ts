import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import OpenCC from "opencc-js";

import { db } from "@/lib/db";
import {
  normalizeSingleSourcePoems,
  type NormalizedPoem,
  type RawPoem,
} from "@/lib/poetry/normalize";
import { buildPoetryUpsert, writeImportPayloadToDb } from "@/scripts/import-ts300";

const DATA_DIR = path.join(process.cwd(), "data");
const GS300_FILE = path.join(DATA_DIR, "gs300.simple.json");

const convertToTraditional = OpenCC.Converter({ from: "cn", to: "tw" });

const AUTHOR_DYNASTY: Record<string, string> = {
  // 先秦
  "夏商民歌": "先秦", "诗经": "先秦", "荆轲": "先秦", "项羽": "先秦",
  // 两汉
  "刘邦": "两汉", "刘彻": "两汉", "李延年": "两汉",
  "古诗十九首": "两汉", "汉乐府民歌": "两汉", "佚名": "两汉",
  // 魏晋
  "曹操": "魏晋", "曹丕": "魏晋", "曹植": "魏晋", "王粲": "魏晋",
  "刘桢": "魏晋", "徐干": "魏晋", "嵇康": "魏晋", "阮籍": "魏晋",
  "左思": "魏晋", "张翰": "魏晋", "陶渊明": "魏晋", "吴隐之": "魏晋",
  "无名氏": "魏晋",
  // 南北朝
  "谢灵运": "南北朝", "鲍照": "南北朝", "谢朓": "南北朝", "沈约": "南北朝",
  "何逊": "南北朝", "吴均": "南北朝", "陶宏景": "南北朝", "王籍": "南北朝",
  "阴铿": "南北朝", "徐陵": "南北朝", "庾信": "南北朝", "萧纲": "南北朝",
  "陆凯": "南北朝", "范云": "南北朝", "释宝月": "南北朝", "刘昶": "南北朝",
  "江总": "南北朝", "薛道衡": "南北朝",
  "北朝民歌": "南北朝", "南朝民歌": "南北朝",
  // 宋朝
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
  // 元朝（含金末元初）
  "元好问": "元", "王庭筠": "元", "陈孚": "元", "刘因": "元",
  "赵孟頫": "元", "黄庚": "元", "杨载": "元", "虞集": "元",
  "揭侯斯": "元", "王冕": "元", "徐元杰": "元", "萨都刺": "元",
  // 明朝
  "高启": "明", "袁凯": "明", "杨基": "明", "王恭": "明",
  "杨士奇": "明", "毛铉": "明", "李昌祺": "明", "于谦": "明",
  "沈周": "明", "李东阳": "明", "唐寅": "明", "李梦阳": "明",
  "徐祯卿": "明", "边贡": "明", "何景明": "明", "杨慎": "明",
  "谢榛": "明", "李攀龙": "明", "杨继盛": "明", "徐渭": "明",
  "戚继光": "明", "文嘉": "明", "高攀龙": "明", "袁宏道": "明",
  "汤显祖": "明", "陈子龙": "明", "夏完淳": "明", "明朝民歌": "明",
  // 清朝（含晚清民国初）
  "吴伟业": "清", "尤侗": "清", "朱彝尊": "清", "王士祯": "清",
  "施闰章": "清", "沈德潜": "清", "纳兰性德": "清", "赵执信": "清",
  "厉鹗": "清", "屈复": "清", "蒋士铨": "清", "纪昀": "清",
  "袁枚": "清", "赵翼": "清", "姚鼐": "清", "高鼎": "清",
  "丘逢甲": "清", "谭嗣同": "清", "梁启超": "清", "秋瑾": "清",
  "章炳麟": "清", "查慎行": "清", "黄景仁": "清", "郑燮": "清",
  "龚自珍": "清",
};

function gs300DynastyMap(poem: RawPoem, _index: number): string {
  return AUTHOR_DYNASTY[poem.author] ?? "其他";
}

async function main() {
  try {
    const raw = await readFile(GS300_FILE, "utf8");
    const poems = JSON.parse(raw) as RawPoem[];

    console.error(`Loaded ${poems.length} gs300 poems`);

    const poetries = normalizeSingleSourcePoems(poems, {
      idPrefix: "gs300",
      dynastyMap: gs300DynastyMap,
      convertToTraditional: convertToTraditional as (text: string) => string,
    });

    console.error(`Normalized ${poetries.length} poems`);

    await writeImportPayloadToDb({ poetries, dailySeeds: [] });

    // Print summary
    const dynastyCounts = new Map<string, number>();
    for (const p of poetries) {
      dynastyCounts.set(p.dynasty, (dynastyCounts.get(p.dynasty) ?? 0) + 1);
    }
    console.log(JSON.stringify({
      source: "gs300",
      count: poetries.length,
      dynasties: Object.fromEntries(dynastyCounts),
    }, null, 2));
  } finally {
    await db.$disconnect();
  }
}

const entrypointUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;

if (entrypointUrl && import.meta.url === entrypointUrl) {
  void main().catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exitCode = 1;
  });
}
