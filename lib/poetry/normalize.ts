import OpenCC from "opencc-js";

const toSimplified = OpenCC.Converter({ from: "t", to: "cn" });

const THEME_BLACKLIST = new Set(["唐诗三百首"]);
const DIFFICULTY_KEYWORDS = [
  { value: 3, keywords: ["古诗", "乐府", "歌行", "七言古诗", "五言古诗"] },
  { value: 2, keywords: ["律诗", "绝句"] },
];

export type RawTs300Poem = {
  id: string;
  title: string;
  author: string;
  paragraphs: string[];
  tags?: string[];
};

export type NormalizedPoem = {
  id: string;
  sourceId: number;
  sourceUid: string;
  title: string;
  titleOriginal: string;
  author: string;
  authorOriginal: string;
  dynasty: "唐";
  lines: string[];
  tags: string[];
  themes: string[];
  difficulty: number;
  imageKey: string;
  imageStatus: "placeholder" | "ready";
};

function padPoetryId(index: number) {
  return String(index + 1).padStart(4, "0");
}

function simplifyText(value: string) {
  return toSimplified(value).trim().replaceAll("沈", "沉");
}

function normalizeTags(tags?: string[]) {
  return (tags ?? []).map((tag) => tag.trim()).filter(Boolean);
}

function extractThemes(tags: string[]) {
  return tags.filter((tag) => !THEME_BLACKLIST.has(tag));
}

function inferDifficulty(tags: string[]) {
  for (const rule of DIFFICULTY_KEYWORDS) {
    if (tags.some((tag) => rule.keywords.some((keyword) => tag.includes(keyword)))) {
      return rule.value;
    }
  }

  return 1;
}

export function normalizeTs300Poem(
  poem: RawTs300Poem,
  index: number,
): NormalizedPoem {
  const poetryId = `ts300-${padPoetryId(index)}`;
  const tags = normalizeTags(poem.tags);

  return {
    id: poetryId,
    sourceId: index + 1,
    sourceUid: poem.id,
    title: simplifyText(poem.title),
    titleOriginal: poem.title.trim(),
    author: simplifyText(poem.author),
    authorOriginal: poem.author.trim(),
    dynasty: "唐",
    lines: poem.paragraphs.map((line) => simplifyText(line)),
    tags,
    themes: extractThemes(tags),
    difficulty: inferDifficulty(tags),
    imageKey: poetryId,
    imageStatus: "placeholder",
  };
}

export function normalizeTs300Poems(poems: RawTs300Poem[]) {
  return poems.map((poem, index) => normalizeTs300Poem(poem, index));
}
