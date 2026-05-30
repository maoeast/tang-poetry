import { db } from "@/lib/db";
import { syncReviewStateFromLearningEvent } from "@/lib/review/scheduler";

type PoetryRepository = {
  poetry: {
    findUnique: (args: {
      where: { id: string };
      select: {
        id: true;
        title: true;
        author: true;
        dynasty: true;
        lines: true;
        themes: true;
        pinyin: true;
        translation: true;
        imageKey: true;
        imageStatus: true;
      };
    }) => Promise<{
      id: string;
      title: string;
      author: string;
      dynasty: string;
      lines: unknown;
      themes: unknown;
      pinyin: unknown;
      translation: string | null;
      imageKey: string | null;
      imageStatus: string;
    } | null>;
    findMany: (args: {
      where: unknown;
      select: {
        id: true;
        title: true;
        author: true;
        dynasty: true;
        lines: true;
      };
      take: number;
    }) => Promise<
      Array<{
        id: string;
        title: string;
        author: string;
        dynasty: string;
        lines: unknown;
      }>
    >;
  };
  learningRecord?: {
    create: (args: {
      data: {
        userId: string;
        poetryId: string;
        eventType: string;
      };
    }) => Promise<unknown>;
  };
};

export type PoetryDetail = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  lines: string[];
  themes: string[];
  pinyin: string[];
  translation: string | null;
  imageKey: string | null;
  imageStatus: string;
};

export type RelatedPoetry = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  previewLine: string;
};

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function getPoetryById(
  id: string,
  repository?: PoetryRepository,
): Promise<PoetryDetail | null> {
  const targetRepository = repository ?? (db as unknown as PoetryRepository);
  const poetry = await targetRepository.poetry.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      author: true,
      dynasty: true,
      lines: true,
      themes: true,
      pinyin: true,
      translation: true,
      imageKey: true,
      imageStatus: true,
    },
  });

  if (!poetry) {
    return null;
  }

  return {
    ...poetry,
    lines: toStringArray(poetry.lines),
    themes: toStringArray(poetry.themes),
    pinyin: toStringArray(poetry.pinyin),
  };
}

export async function getRelatedPoetries(
  poetry: Pick<PoetryDetail, "id" | "author" | "themes">,
  repository?: PoetryRepository,
): Promise<RelatedPoetry[]> {
  const targetRepository = repository ?? (db as unknown as PoetryRepository);
  const related = await targetRepository.poetry.findMany({
    where: {
      id: { not: poetry.id },
      OR: [
        { author: poetry.author },
        poetry.themes.length > 0
          ? {
              themes: {
                array_contains: poetry.themes,
              },
            }
          : undefined,
      ].filter(Boolean),
    },
    select: {
      id: true,
      title: true,
      author: true,
      dynasty: true,
      lines: true,
    },
    take: 4,
  });

  return related.map((item) => ({
    id: item.id,
    title: item.title,
    author: item.author,
    dynasty: item.dynasty,
    previewLine: toStringArray(item.lines)[0] ?? "",
  }));
}

export async function recordPoetryView(
  poetryId: string,
  repository?: PoetryRepository,
) {
  const userId = process.env.SYSTEM_USER_ID;
  const targetRepository = repository ?? (db as unknown as PoetryRepository);

  if (!userId || !targetRepository.learningRecord) {
    return;
  }

  await targetRepository.learningRecord.create({
    data: {
      userId,
      poetryId,
      eventType: "view_poetry",
    },
  });

  if (!repository) {
    await syncReviewStateFromLearningEvent({
      poetryId,
      eventType: "view_poetry",
    });
  }
}
