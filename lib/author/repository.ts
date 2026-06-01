import type { ScriptVariant } from "@/lib/poetry/script-variant";
import type { PoetryImage } from "@/lib/images/repository";

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

// --- Placeholder implementations (Task 2 will fill in) ---

export async function getAuthorByName(
  _name: string,
  _scriptVariant: ScriptVariant = "zh-Hans",
  _data?: AuthorData[],
): Promise<AuthorInfo | null> {
  return null;
}

export async function getPoemsByAuthor(
  _author: string,
  _scriptVariant: ScriptVariant = "zh-Hans",
  _repository?: AuthorPoemsRepository,
  _dependencies?: AuthorPoemsDependencies,
): Promise<AuthorPoem[]> {
  return [];
}
