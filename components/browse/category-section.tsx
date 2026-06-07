import type { PoetryCategory } from "@/lib/browse/repository";
import { PoetryCard } from "./poetry-card";

/* ── Seal stamp abbreviations (引首章) ── */
const SEAL_ABBR: Record<string, string> = {
  五言绝句: "五绝",
  七言绝句: "七绝",
  五言律诗: "五律",
  七言律诗: "七律",
  五言古诗: "五古",
  七言古诗: "七古",
  乐府: "樂府",
  小令: "小令",
  中调: "中调",
  长调: "长调",
  先秦: "先秦",
  两汉: "兩漢",
  魏晋: "魏晉",
  南北朝: "南北",
  宋朝: "宋朝",
  元朝: "元朝",
  明朝: "明朝",
  清朝: "清朝",
  未分类: "其他",
  // Scene/season dimensions
  time: "节律",
  season: "四季",
  nature: "万物",
  space: "行走",
  social: "人情",
  其他: "其他",
};

/* ── Chinese numeral conversion (大写数字) ── */
const DIGITS = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];

function toChineseNumeral(n: number): string {
  if (n <= 0) return DIGITS[0];
  if (n < 10) return DIGITS[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return (tens > 1 ? DIGITS[tens] : "") + "拾" + (ones > 0 ? DIGITS[ones] : "");
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    if (remainder === 0) return DIGITS[hundreds] + "佰";
    return (
      DIGITS[hundreds] +
      "佰" +
      (remainder < 10 ? "零" : "") +
      toChineseNumeral(remainder)
    );
  }
  return String(n);
}

type CategorySectionProps = {
  category: PoetryCategory;
};

export function CategorySection({ category }: CategorySectionProps) {
  const sealText = SEAL_ABBR[category.tag] ?? category.label;
  const chineseCount = toChineseNumeral(category.count);

  return (
    <section
      id={`section-${category.tag}`}
      className="scroll-mt-14 mb-28 last:mb-0"
    >
      {/* Title group: seal + title + classical count */}
      <div className="mb-8 flex items-center gap-4">
        {/* 引首章 — red seal stamp */}
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-accent text-[0.7rem] font-serif leading-none text-accent select-none"
          aria-hidden="true"
        >
          {sealText}
        </span>
        <h2 className="text-3xl font-serif tracking-widest text-ink-900 antialiased">
          {category.label}
        </h2>
        <span className="ml-1 whitespace-nowrap text-sm tracking-widest text-ink-400 font-serif antialiased">
          · {chineseCount}首 ·
        </span>
      </div>

      {/* Card grid — generous gap for 留白 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {category.poems.map((poem) => (
          <PoetryCard key={poem.id} poem={poem} />
        ))}
      </div>
    </section>
  );
}
