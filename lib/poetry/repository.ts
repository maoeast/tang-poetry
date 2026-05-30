import { db } from "@/lib/db";
import { shouldCreateViewRecord, toUtcDayKey } from "@/lib/poetry/view-record";
import { getPoetryImage, type PoetryImage } from "@/lib/images/repository";
import { syncReviewStateFromLearningEvent } from "@/lib/review/scheduler";

type PoetryRepository = {
  poetry: {
    findUnique?: (args: {
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
    findMany?: (args: {
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
    findMany?: (args: {
      where: {
        userId: string;
        poetryId: string;
        eventType: string;
      };
      select: {
        createdAt: true;
      };
      orderBy: {
        createdAt: "asc" | "desc";
      };
    }) => Promise<Array<{ createdAt: Date }>>;
    create: (args: {
      data: {
        userId: string;
        poetryId: string;
        eventType: string;
        dayKey?: string;
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
  image: PoetryImage;
};

type PoetryRepositoryDependencies = {
  getPoetryImage: (poetryId: string) => Promise<PoetryImage>;
};

type SyncReviewState = typeof syncReviewStateFromLearningEvent;

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

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
  dependencies: PoetryRepositoryDependencies = { getPoetryImage },
): Promise<PoetryDetail | null> {
  const targetRepository = repository ?? (db as unknown as PoetryRepository);
  if (!targetRepository.poetry.findUnique) {
    return null;
  }

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

  const image = await dependencies.getPoetryImage(poetry.id);

  return {
    ...poetry,
    lines: toStringArray(poetry.lines),
    themes: toStringArray(poetry.themes),
    pinyin: toStringArray(poetry.pinyin),
    image,
  };
}

export async function getRelatedPoetries(
  poetry: Pick<PoetryDetail, "id" | "author" | "themes">,
  repository?: PoetryRepository,
): Promise<RelatedPoetry[]> {
  const targetRepository = repository ?? (db as unknown as PoetryRepository);
  if (!targetRepository.poetry.findMany) {
    return [];
  }

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
  options?: {
    now?: Date;
    syncReviewState?: SyncReviewState;
    reviewRepository?: Parameters<SyncReviewState>[1];
  },
) {
  const userId = process.env.SYSTEM_USER_ID;
  const targetRepository = repository ?? (db as unknown as PoetryRepository);
  const now = options?.now ?? new Date();
  const syncReviewState = options?.syncReviewState;

  if (!userId || !targetRepository.learningRecord) {
    return;
  }

  const existingViewRecords = targetRepository.learningRecord.findMany
    ? await targetRepository.learningRecord.findMany({
        where: {
          userId,
          poetryId,
          eventType: "view_poetry",
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    : [];

  if (
    !shouldCreateViewRecord({
      existingCreatedAts: existingViewRecords.map((record) => record.createdAt),
      targetDate: now,
    })
  ) {
    return;
  }

  const dayKey = toUtcDayKey(now);

  try {
    await targetRepository.learningRecord.create({
      data: {
        userId,
        poetryId,
        eventType: "view_poetry",
        dayKey,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return;
    }

    throw error;
  }

  if (syncReviewState) {
    await syncReviewState(
      {
        poetryId,
        eventType: "view_poetry",
      },
      options?.reviewRepository,
    );

    return;
  }

  if (!repository) {
    await syncReviewStateFromLearningEvent({
      poetryId,
      eventType: "view_poetry",
    });
  }
}
