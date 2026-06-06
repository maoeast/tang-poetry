const THEME_BLACKLIST = new Set(["唐诗三百首", "古诗三百", "宋词精选"]);
const DIFFICULTY_KEYWORDS = [
  { value: 3, keywords: ["古诗", "乐府", "歌行", "七言古诗", "五言古诗", "词"] },
  { value: 2, keywords: ["律诗", "绝句", "小令", "中调", "长调"] },
];

export type RawPoem = {
  id: string;
  title: string;
  author: string;
  paragraphs: string[];
  tags?: string[];
};

/** @deprecated Use RawPoem instead */
export type RawTs300Poem = RawPoem;

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
  dynasty: string;
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

export type NormalizeOptions = {
  idPrefix: string;
  dynasty: string;
  convertToTraditional?: (text: string) => string;
};

export function normalizePoem(
  simplePoem: RawPoem,
  rawPoem: RawPoem | null,
  index: number,
  options: NormalizeOptions,
): NormalizedPoem {
  const poetryId = `${options.idPrefix}-${padPoetryId(index)}`;
  const tags = normalizeTags(simplePoem.tags);
  const linesZhHans = normalizeLines(simplePoem.paragraphs);
  const titleZhHans = normalizeText(simplePoem.title);
  const authorZhHans = normalizeText(simplePoem.author);

  let titleZhHant: string;
  let authorZhHant: string;
  let linesZhHant: string[];

  if (rawPoem) {
    titleZhHant = normalizeText(rawPoem.title);
    authorZhHant = normalizeText(rawPoem.author);
    linesZhHant = normalizeLines(rawPoem.paragraphs);
  } else {
    const convert = options.convertToTraditional ?? ((t: string) => t);
    titleZhHant = convert(titleZhHans);
    authorZhHant = convert(authorZhHans);
    linesZhHant = linesZhHans.map((line) => convert(line));
  }

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
    dynasty: options.dynasty,
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

export type SingleSourceOptions = {
  idPrefix: string;
  dynastyMap?: (poem: RawPoem, index: number) => string;
  convertToTraditional: (text: string) => string;
};

export function normalizeSingleSourcePoems(
  poems: RawPoem[],
  options: SingleSourceOptions,
): NormalizedPoem[] {
  return poems.map((poem, index) => {
    const dynasty = options.dynastyMap
      ? options.dynastyMap(poem, index)
      : "未知";
    return normalizePoem(poem, null, index, {
      idPrefix: options.idPrefix,
      dynasty,
      convertToTraditional: options.convertToTraditional,
    });
  });
}

/** Backward-compatible wrapper for ts300 imports */
export function normalizeTs300Poem(
  simplePoem: RawPoem,
  rawPoem: RawPoem,
  index: number,
): NormalizedPoem {
  return normalizePoem(simplePoem, rawPoem, index, {
    idPrefix: "ts300",
    dynasty: "唐",
  });
}

export function normalizeTs300Poems(
  simplePoems: RawPoem[],
  rawPoems: RawPoem[],
) {
  return simplePoems.map((simplePoem, index) =>
    normalizeTs300Poem(simplePoem, rawPoems[index]!, index),
  );
}
