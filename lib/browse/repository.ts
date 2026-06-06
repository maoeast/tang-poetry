import { db } from "@/lib/db";
import {
  getAllPoetryImages,
  getPlaceholderImage,
  type PoetryImage,
} from "@/lib/images/repository";
import {
  pickPoetryContentVariant,
  type ScriptVariant,
} from "@/lib/poetry/script-variant";

export const FORM_TAGS = [
  "五言绝句",
  "七言绝句",
  "五言律诗",
  "七言律诗",
  "五言古诗",
  "七言古诗",
  "乐府",
  "小令",
  "中调",
  "长调",
] as const;

export type FormTag = (typeof FORM_TAGS)[number];

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export type BrowsePoem = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  image: PoetryImage;
};

export type PoetryCategory = {
  tag: string;
  label: string;
  count: number;
  poems: BrowsePoem[];
};

type BrowseRepository = {
  poetry: {
    findMany: (args: {
      select: {
        id: true;
        title: true;
        author: true;
        dynasty: true;
        tags: true;
        lines: true;
        titleZhHans: true;
        titleZhHant: true;
        authorZhHans: true;
        authorZhHant: true;
        linesZhHans: true;
        linesZhHant: true;
      };
    }) => Promise<
      Array<{
        id: string;
        title: string;
        author: string;
        dynasty: string;
        tags: unknown;
        lines: unknown;
        titleZhHans: string | null;
        titleZhHant: string | null;
        authorZhHans: string | null;
        authorZhHant: string | null;
        linesZhHans: unknown;
        linesZhHant: unknown;
      }>
    >;
  };
};

type BrowseDependencies = {
  getAllImages: () => Promise<Map<string, PoetryImage>>;
};

function classifyPoem(tags: string[]): FormTag | null {
  for (const formTag of FORM_TAGS) {
    if (tags.includes(formTag)) return formTag;
  }
  return null;
}

export type SourceType = "ts300" | "gs300" | "sc200";

const DYNASTY_GROUPS = [
  { label: "先秦", dynasties: ["先秦"] },
  { label: "两汉", dynasties: ["两汉", "汉", "西汉", "东汉"] },
  { label: "魏晋", dynasties: ["魏晋", "魏", "晋"] },
  { label: "南北朝", dynasties: ["南北朝", "南朝", "北朝"] },
  { label: "宋朝", dynasties: ["宋"] },
  { label: "元朝", dynasties: ["元"] },
  { label: "明朝", dynasties: ["明"] },
  { label: "清朝", dynasties: ["清"] },
] as const;

function classifyDynasty(dynasty: string): string {
  for (const group of DYNASTY_GROUPS) {
    if ((group.dynasties as readonly string[]).includes(dynasty)) return group.label;
  }
  return "其他";
}

/**
 * Search poems by query string across title, author, and lines content.
 * Searches both simplified and traditional variants for maximum coverage.
 * Returns a flat list of BrowsePoem (no category grouping).
 */
export async function searchPoems(
  query: string,
  scriptVariant: ScriptVariant,
  repository?: BrowseRepository,
  dependencies?: BrowseDependencies,
): Promise<BrowsePoem[]> {
  const repo = repository ?? (db as unknown as BrowseRepository);
  const deps = dependencies ?? { getAllImages: () => getAllPoetryImages() };

  const normalizedQuery = query.trim().toLowerCase();

  const [poems, imageMap] = await Promise.all([
    repo.poetry.findMany({
      select: {
        id: true,
        title: true,
        author: true,
        dynasty: true,
        tags: true,
        lines: true,
        titleZhHans: true,
        titleZhHant: true,
        authorZhHans: true,
        authorZhHant: true,
        linesZhHans: true,
        linesZhHant: true,
      },
    }),
    deps.getAllImages(),
  ]);

  const results: BrowsePoem[] = [];

  for (const poem of poems) {
    // Build searchable text from all variants
    const allTitles = [poem.title, poem.titleZhHans, poem.titleZhHant].filter(
      Boolean,
    ) as string[];
    const allAuthors = [
      poem.author,
      poem.authorZhHans,
      poem.authorZhHant,
    ].filter(Boolean) as string[];
    const allLines = [
      ...toStringArray(poem.lines),
      ...toStringArray(poem.linesZhHans),
      ...toStringArray(poem.linesZhHant),
    ];

    const searchableText = [...allTitles, ...allAuthors, ...allLines]
      .join(" ")
      .toLowerCase();

    if (searchableText.includes(normalizedQuery)) {
      const variant = pickPoetryContentVariant(poem, scriptVariant);
      const image = imageMap.get(poem.id) ?? getPlaceholderImage(poem.id);

      results.push({
        id: poem.id,
        title: variant.title,
        author: variant.author,
        dynasty: poem.dynasty,
        image,
      });
    }
  }

  return results;
}

export async function getPoetryByCategories(
  scriptVariant: ScriptVariant,
  repository?: BrowseRepository,
  dependencies?: BrowseDependencies,
  source?: SourceType,
): Promise<PoetryCategory[]> {
  const repo = repository ?? (db as unknown as BrowseRepository);
  const deps = dependencies ?? { getAllImages: () => getAllPoetryImages() };

  const [poems, imageMap] = await Promise.all([
    repo.poetry.findMany({
      select: {
        id: true,
        title: true,
        author: true,
        dynasty: true,
        tags: true,
        lines: true,
        titleZhHans: true,
        titleZhHant: true,
        authorZhHans: true,
        authorZhHant: true,
        linesZhHans: true,
        linesZhHant: true,
      },
    }),
    deps.getAllImages(),
  ]);

  const sourcePrefix = source ? `${source}-` : null;

  if (source === "gs300") {
    // Dynasty-based categorization for 古诗三百
    const buckets = new Map<string, BrowsePoem[]>();
    for (const group of DYNASTY_GROUPS) buckets.set(group.label, []);
    buckets.set("其他", []);

    for (const poem of poems) {
      if (sourcePrefix && !poem.id.startsWith(sourcePrefix)) continue;

      const variant = pickPoetryContentVariant(poem, scriptVariant);
      const image = imageMap.get(poem.id) ?? getPlaceholderImage(poem.id);

      const browsePoem: BrowsePoem = {
        id: poem.id,
        title: variant.title,
        author: variant.author,
        dynasty: poem.dynasty,
        image,
      };

      const group = classifyDynasty(poem.dynasty);
      buckets.get(group)!.push(browsePoem);
    }

    const categories: PoetryCategory[] = [];
    for (const group of DYNASTY_GROUPS) {
      const groupPoems = buckets.get(group.label)!;
      if (groupPoems.length > 0) {
        categories.push({
          tag: group.label,
          label: group.label,
          count: groupPoems.length,
          poems: groupPoems,
        });
      }
    }
    const other = buckets.get("其他")!;
    if (other.length > 0) {
      categories.push({ tag: "其他", label: "其他", count: other.length, poems: other });
    }
    return categories;
  }

  // Default: form-based categorization (ts300, sc200, or all)
  const buckets = new Map<FormTag | "未分类", BrowsePoem[]>();
  for (const tag of FORM_TAGS) buckets.set(tag, []);
  buckets.set("未分类", []);

  for (const poem of poems) {
    if (sourcePrefix && !poem.id.startsWith(sourcePrefix)) continue;

    const variant = pickPoetryContentVariant(poem, scriptVariant);
    const tags = toStringArray(poem.tags);
    const formTag = classifyPoem(tags);
    const image = imageMap.get(poem.id) ?? getPlaceholderImage(poem.id);

    const browsePoem: BrowsePoem = {
      id: poem.id,
      title: variant.title,
      author: variant.author,
      dynasty: poem.dynasty,
      image,
    };

    buckets.get(formTag ?? "未分类")!.push(browsePoem);
  }

  const categories: PoetryCategory[] = [];
  for (const tag of FORM_TAGS) {
    const tagPoems = buckets.get(tag)!;
    if (source && tagPoems.length === 0) continue;
    categories.push({ tag, label: tag, count: tagPoems.length, poems: tagPoems });
  }
  const uncategorized = buckets.get("未分类")!;
  if (uncategorized.length > 0) {
    categories.push({
      tag: "未分类",
      label: "其他",
      count: uncategorized.length,
      poems: uncategorized,
    });
  }

  return categories;
}
