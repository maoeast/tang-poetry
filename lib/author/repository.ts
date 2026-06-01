import { pickPoetryContentVariant, type ScriptVariant } from "@/lib/poetry/script-variant";
import type { PoetryImage } from "@/lib/images/repository";
import authorsData from "../../data/authors.json";
import { db } from "@/lib/db";
import {
  getAllPoetryImages,
  getPlaceholderImage,
} from "@/lib/images/repository";

// --- JSON data types ---

export type AuthorData = {
  name: string;
  nameZhHant?: string | null;
  avatarUrl?: string | null;
  dynasty: string;
  courtesyName?: string | null;
  literaryName?: string | null;
  bio?: string | null;
  bioZhHant?: string | null;
  lifeStory?: string | null;
  lifeStoryZhHant?: string | null;
  sourceUrl?: string | null;
};

// --- Resolved author info (returned to components) ---

export type AuthorInfo = {
  name: string;
  avatarUrl: string;
  dynasty: string;
  courtesyName: string | null;
  literaryName: string | null;
  bio: string | null;
  lifeStory: string | null;
  sourceUrl: string | null;
};

// --- Author's poem item ---

export type AuthorPoem = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  previewLine: string;
  formTag: string | null;
  image: PoetryImage;
};

// --- Repository injection types ---

type AuthorPoemsRecord = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  lines: unknown;
  tags: unknown;
  difficulty: number;
  titleZhHans: string | null;
  titleZhHant: string | null;
  authorZhHans: string | null;
  authorZhHant: string | null;
  linesZhHans: unknown;
  linesZhHant: unknown;
};

export type AuthorPoemsRepository = {
  poetry: {
    findMany: (args: {
      where: { author: string };
      select: Record<string, true>;
      orderBy: { difficulty: "asc" };
    }) => Promise<AuthorPoemsRecord[]>;
  };
};

export type AuthorPoemsDependencies = {
  getAllImages: () => Promise<Map<string, PoetryImage>>;
};

const FORM_TAGS = [
  "五言绝句",
  "七言绝句",
  "五言律诗",
  "七言律诗",
  "五言古诗",
  "七言古诗",
  "乐府",
] as const;

const DEFAULT_AVATAR = "/images/authors/default.svg";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function classifyFormTag(tags: string[]): string | null {
  for (const formTag of FORM_TAGS) {
    if (tags.includes(formTag)) return formTag;
  }
  return null;
}

// --- Implementations ---

export async function getAuthorByName(
  name: string,
  scriptVariant: ScriptVariant = "zh-Hans",
  data: AuthorData[] = authorsData as AuthorData[],
): Promise<AuthorInfo | null> {
  const entry = data.find((a) => a.name === name);
  if (!entry) return null;

  const bio =
    scriptVariant === "zh-Hant"
      ? entry.bioZhHant ?? entry.bio ?? null
      : entry.bio ?? null;

  const lifeStory =
    scriptVariant === "zh-Hant"
      ? entry.lifeStoryZhHant ?? entry.lifeStory ?? null
      : entry.lifeStory ?? null;

  return {
    name: entry.name,
    avatarUrl: entry.avatarUrl ?? DEFAULT_AVATAR,
    dynasty: entry.dynasty,
    courtesyName: entry.courtesyName ?? null,
    literaryName: entry.literaryName ?? null,
    bio,
    lifeStory,
    sourceUrl: entry.sourceUrl ?? null,
  };
}

export async function getPoemsByAuthor(
  author: string,
  scriptVariant: ScriptVariant = "zh-Hans",
  repository?: AuthorPoemsRepository,
  dependencies?: AuthorPoemsDependencies,
): Promise<AuthorPoem[]> {
  const repo = repository ?? (db as unknown as AuthorPoemsRepository);
  const deps = dependencies ?? { getAllImages: () => getAllPoetryImages() };

  const [records, imageMap] = await Promise.all([
    repo.poetry.findMany({
      where: { author },
      select: {
        id: true,
        title: true,
        author: true,
        dynasty: true,
        lines: true,
        tags: true,
        difficulty: true,
        titleZhHans: true,
        titleZhHant: true,
        authorZhHans: true,
        authorZhHant: true,
        linesZhHans: true,
        linesZhHant: true,
      },
      orderBy: { difficulty: "asc" },
    }),
    deps.getAllImages(),
  ]);

  const sorted = [...records].sort((a, b) => a.difficulty - b.difficulty);

  return sorted.map((record) => {
    const variant = pickPoetryContentVariant(record, scriptVariant);
    const tags = toStringArray(record.tags);
    const lines = toStringArray(record.lines);
    const image = imageMap.get(record.id) ?? getPlaceholderImage(record.id);

    return {
      id: record.id,
      title: variant.title,
      author: variant.author,
      dynasty: record.dynasty,
      previewLine: lines[0] ?? "",
      formTag: classifyFormTag(tags),
      image,
    };
  });
}
