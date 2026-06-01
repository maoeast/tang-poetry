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
  tag: FormTag | "未分类";
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

export async function getPoetryByCategories(
  scriptVariant: ScriptVariant,
  repository?: BrowseRepository,
  dependencies?: BrowseDependencies,
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

  const buckets = new Map<FormTag | "未分类", BrowsePoem[]>();
  for (const tag of FORM_TAGS) buckets.set(tag, []);
  buckets.set("未分类", []);

  for (const poem of poems) {
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
    const poems = buckets.get(tag)!;
    categories.push({ tag, label: tag, count: poems.length, poems });
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
