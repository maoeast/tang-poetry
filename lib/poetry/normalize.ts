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
  titleZhHans: string;
  titleZhHant: string;
  author: string;
  authorOriginal: string;
  authorZhHans: string;
  authorZhHant: string;
  dynasty: "唐";
  lines: string[];
  linesZhHans: string[];
  linesZhHant: string[];
  tags: string[];
  themes: string[];
  difficulty: number;
  imageKey: string;
  imageStatus: "placeholder" | "ready";
};

function padPoetryId(index: number) {
  return String(index + 1).padStart(4, "0");
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizeLines(lines: string[]) {
  return lines.map((line) => normalizeText(line));
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
  simplePoem: RawTs300Poem,
  rawPoem: RawTs300Poem,
  index: number,
): NormalizedPoem {
  const poetryId = `ts300-${padPoetryId(index)}`;
  const tags = normalizeTags(simplePoem.tags);
  const linesZhHans = normalizeLines(simplePoem.paragraphs);
  const linesZhHant = normalizeLines(rawPoem.paragraphs);
  const titleZhHans = normalizeText(simplePoem.title);
  const titleZhHant = normalizeText(rawPoem.title);
  const authorZhHans = normalizeText(simplePoem.author);
  const authorZhHant = normalizeText(rawPoem.author);

  return {
    id: poetryId,
    sourceId: index + 1,
    sourceUid: simplePoem.id,
    title: titleZhHans,
    titleOriginal: titleZhHant,
    titleZhHans,
    titleZhHant,
    author: authorZhHans,
    authorOriginal: authorZhHant,
    authorZhHans,
    authorZhHant,
    dynasty: "唐",
    lines: linesZhHans,
    linesZhHans,
    linesZhHant,
    tags,
    themes: extractThemes(tags),
    difficulty: inferDifficulty(tags),
    imageKey: poetryId,
    imageStatus: "placeholder",
  };
}

export function normalizeTs300Poems(
  simplePoems: RawTs300Poem[],
  rawPoems: RawTs300Poem[],
) {
  return simplePoems.map((simplePoem, index) =>
    normalizeTs300Poem(simplePoem, rawPoems[index]!, index),
  );
}
