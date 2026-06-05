import { db } from "@/lib/db";
import { existsSync } from "node:fs";

import { getAudioStatus, getAudioUrl, hasMappedAudioFile, hasExplainAudioFile, getExplainAudioUrl } from "@/lib/audio";
import { type ExplanationAudience, getExplanationCacheKey } from "@/lib/ai/prompts";
import type { PoetryExplanation } from "@/lib/ai/deepseek";
import {
  pickPoetryContentVariant,
  type ScriptVariant,
} from "@/lib/poetry/script-variant";
import { shouldCreateViewRecord, toUtcDayKey } from "@/lib/poetry/view-record";
import { getPoetryImage, getPoetryImages, type PoetryImage } from "@/lib/images/repository";
import { syncReviewStateFromLearningEvent } from "@/lib/review/scheduler";
import authorsData from "../../data/authors.json";

type AudioLineTiming = {
  lineIndex: number;
  startMs: number;
};

type PoetryAudio = {
  audioStatus: "ready" | "tts" | "none";
  url: string | null;
  durationMs: number;
  lineTimings?: AudioLineTiming[];
};

export type PoetryRepository = {
  poetry: {
    findUnique?: (args: {
      where: { id: string };
      select: Record<string, true>;
    }) => Promise<{
      id: string;
      sourceUid: string | null;
      title: string;
      titleOriginal: string | null;
      titleZhHans: string | null;
      titleZhHant: string | null;
      author: string;
      authorOriginal: string | null;
      authorZhHans: string | null;
      authorZhHant: string | null;
      dynasty: string;
      lines: unknown;
      linesZhHans: unknown;
      linesZhHant: unknown;
      themes: unknown;
      pinyin: unknown;
      translation: string | null;
      annotation: string | null;
      imageKey: string | null;
      imageStatus: string;
      aiExplanation: unknown;
      audioMeta: {
        status: string;
        durationMs: number;
        lineTimings: unknown;
      } | null;
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

type PoetryRecordWithSourceUid = {
  id: string;
  sourceUid: string | null;
  title: string;
  titleOriginal: string | null;
  titleZhHans: string | null;
  titleZhHant: string | null;
  author: string;
  authorOriginal: string | null;
  authorZhHans: string | null;
  authorZhHant: string | null;
  dynasty: string;
  lines: unknown;
  linesZhHans: unknown;
  linesZhHant: unknown;
  themes: unknown;
  pinyin: unknown;
  translation: string | null;
  annotation: string | null;
  imageKey: string | null;
  imageStatus: string;
  aiExplanation: unknown;
  audioMeta: {
    status: string;
    durationMs: number;
    lineTimings: unknown;
  } | null;
};

type PoetryRecordWithoutSourceUid = Omit<PoetryRecordWithSourceUid, "sourceUid">;

export type ExplanationAudioInfo = {
  url: string;
  exists: boolean;
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
  annotation: string | null;
  imageKey: string | null;
  imageStatus: string;
  image: PoetryImage;
  images: PoetryImage[];
  audio: PoetryAudio;
  authorAvatarUrl: string | null;
  explanations: Partial<Record<ExplanationAudience, PoetryExplanation>>;
  explainAudio: Record<ExplanationAudience, ExplanationAudioInfo>;
};

type PoetryRepositoryDependencies = {
  getPoetryImage: (poetryId: string) => Promise<PoetryImage>;
  getPoetryImages: (poetryId: string) => Promise<PoetryImage[]>;
  hasAudioFile: (poetryId: string, sourceUid?: string | null) => boolean;
  hasExplainAudioFile: (poetryId: string, audience: ExplanationAudience) => boolean;
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

function toAudioLineTimings(value: unknown): AudioLineTiming[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const lineTimings = value.filter((item): item is AudioLineTiming => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return false;
    }

    return (
      "lineIndex" in item &&
      typeof item.lineIndex === "number" &&
      Number.isFinite(item.lineIndex) &&
      "startMs" in item &&
      typeof item.startMs === "number" &&
      Number.isFinite(item.startMs)
    );
  });

  return lineTimings.length > 0 ? lineTimings : undefined;
}

const EXPLAIN_AUDIENCES: ExplanationAudience[] = ["child", "general"];

function toExplanationCache(value: unknown): Partial<Record<ExplanationAudience, PoetryExplanation>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: Partial<Record<ExplanationAudience, PoetryExplanation>> = {};

  for (const audience of EXPLAIN_AUDIENCES) {
    const cacheKey = getExplanationCacheKey(audience);
    const entry = (value as Record<string, unknown>)[cacheKey];

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const candidate = entry as Partial<PoetryExplanation>;

    if (
      typeof candidate.summary === "string" &&
      typeof candidate.imagery === "string" &&
      typeof candidate.emotion === "string" &&
      typeof candidate.cachedAt === "string"
    ) {
      result[audience] = {
        summary: candidate.summary,
        imagery: candidate.imagery,
        emotion: candidate.emotion,
        cachedAt: candidate.cachedAt,
      };
    }
  }

  return result;
}

function toPoetryAudio(
  poetryId: string,
  sourceUid: string | null,
  audioMeta: {
    status: string;
    durationMs: number;
    lineTimings: unknown;
  } | null,
  hasAudioFile: (poetryId: string, sourceUid?: string | null) => boolean,
): PoetryAudio {
  const audioStatus = getAudioStatus(audioMeta);
  const audioUrl = getAudioUrl(poetryId, sourceUid);

  if (audioStatus !== "ready" && audioStatus !== "tts") {
    if (hasAudioFile(poetryId, sourceUid)) {
      return {
        audioStatus: "ready",
        url: audioUrl,
        durationMs: 0,
      };
    }

    return {
      audioStatus: "none",
      url: null,
      durationMs: 0,
    };
  }

  return {
    audioStatus,
    url: audioUrl,
    durationMs:
      typeof audioMeta?.durationMs === "number" && Number.isFinite(audioMeta.durationMs)
        ? Math.max(audioMeta.durationMs, 0)
        : 0,
    lineTimings: toAudioLineTimings(audioMeta?.lineTimings),
  };
}

export async function getPoetryById(
  id: string,
  repository?: PoetryRepository,
  dependencies: PoetryRepositoryDependencies = {
    getPoetryImage,
    getPoetryImages,
    hasAudioFile: (poetryId, sourceUid) =>
      hasMappedAudioFile(poetryId, sourceUid, existsSync),
    hasExplainAudioFile: (poetryId, audience) =>
      hasExplainAudioFile(poetryId, audience, existsSync),
  },
  scriptVariant: ScriptVariant = "zh-Hans",
): Promise<PoetryDetail | null> {
  const targetRepository = repository ?? (db as unknown as PoetryRepository);
  if (!targetRepository.poetry.findUnique) {
    return null;
  }

  const poetry = await targetRepository.poetry.findUnique({
    where: { id },
    select: {
      id: true,
      sourceUid: true,
      title: true,
      titleOriginal: true,
      titleZhHans: true,
      titleZhHant: true,
      author: true,
      authorOriginal: true,
      authorZhHans: true,
      authorZhHant: true,
      dynasty: true,
      lines: true,
      linesZhHans: true,
      linesZhHant: true,
      themes: true,
      pinyin: true,
      translation: true,
      annotation: true,
      imageKey: true,
      imageStatus: true,
      aiExplanation: true,
      audioMeta: true,
    },
  });

  if (!poetry) {
    return null;
  }

  const image = await dependencies.getPoetryImage(poetry.id);
  const images = await dependencies.getPoetryImages(poetry.id);
  // If no real images, fall back to single placeholder
  const allImages = images.length > 0 ? images : [image];
  const sourceUid = poetry.sourceUid;
  const audio = toPoetryAudio(poetry.id, sourceUid, poetry.audioMeta, dependencies.hasAudioFile);
  const content = pickPoetryContentVariant(poetry, scriptVariant);

  const authorEntry = (authorsData as Array<{ name: string; avatarUrl?: string | null }>).find(
    (a) => a.name === poetry.author,
  );
  const authorAvatarUrl = authorEntry?.avatarUrl ?? null;

  const explanations = toExplanationCache(poetry.aiExplanation);
  const explainAudio: Record<ExplanationAudience, ExplanationAudioInfo> = {
    child: {
      url: getExplainAudioUrl(poetry.id, "child"),
      exists: dependencies.hasExplainAudioFile(poetry.id, "child"),
    },
    general: {
      url: getExplainAudioUrl(poetry.id, "general"),
      exists: dependencies.hasExplainAudioFile(poetry.id, "general"),
    },
  };

  return {
    id: poetry.id,
    title: content.title,
    author: content.author,
    dynasty: poetry.dynasty,
    translation: poetry.translation,
    annotation: poetry.annotation,
    imageKey: poetry.imageKey,
    imageStatus: poetry.imageStatus,
    lines: content.lines,
    themes: toStringArray(poetry.themes),
    pinyin: toStringArray(poetry.pinyin),
    image,
    images: allImages,
    audio,
    authorAvatarUrl,
    explanations,
    explainAudio,
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
