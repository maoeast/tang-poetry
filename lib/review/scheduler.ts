import { db } from "@/lib/db";
import { getPoetryImage, type PoetryImage } from "@/lib/images/repository";

const REVIEW_INTERVAL_SEQUENCE = [1, 2, 4, 7, 15, 30] as const;
const UPCOMING_WINDOW_DAYS = 7;
const DEFAULT_POETRY_IMAGE_PATH = "/images/placeholders/default-poetry-card.jpg";
const DEFAULT_IMAGE_STYLE = "storybook-watercolor";
const DEFAULT_PROMPT_VERSION = "v1";

export type ReviewStateSnapshot = {
  userId: string;
  poetryId: string;
  mastery: number;
  reviewStage: number;
  currentIntervalDays: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  wrongCount: number;
  consecutiveWrongCount: number;
  title: string;
  author: string;
  previewLine: string;
  image: PoetryImage;
};

type ReviewStateRecord = {
  userId: string;
  poetryId: string;
  mastery: number;
  reviewStage: number;
  currentIntervalDays: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  wrongCount: number;
  consecutiveWrongCount: number;
  poetry: {
    title: string;
    author: string;
    lines: unknown;
  };
};

type ReviewRepository = {
  reviewState?: {
    findMany: (args: {
      where: {
        userId: string;
      };
      include: {
        poetry: {
          select: {
            title: true;
            author: true;
            lines: true;
          };
        };
      };
      orderBy: [{ wrongCount: "desc" }, { nextReviewAt: "asc" }];
    }) => Promise<ReviewStateRecord[]>;
    findUnique?: (args: {
      where: {
        userId_poetryId: {
          userId: string;
          poetryId: string;
        };
      };
      include: {
        poetry: {
          select: {
            title: true;
            author: true;
            lines: true;
          };
        };
      };
    }) => Promise<ReviewStateRecord | null>;
    upsert?: (args: {
      where: {
        userId_poetryId: {
          userId: string;
          poetryId: string;
        };
      };
      create: {
        userId: string;
        poetryId: string;
        mastery: number;
        reviewStage: number;
        currentIntervalDays: number;
        lastReviewedAt: Date | null;
        nextReviewAt: Date | null;
        wrongCount: number;
        consecutiveWrongCount: number;
      };
      update: {
        mastery: number;
        reviewStage: number;
        currentIntervalDays: number;
        lastReviewedAt: Date | null;
        nextReviewAt: Date | null;
        wrongCount: number;
        consecutiveWrongCount: number;
      };
    }) => Promise<unknown>;
  };
};

type CreateInitialReviewStateInput = {
  userId: string;
  poetryId: string;
  studiedAt?: Date;
};

type UpdateReviewStateAfterAnswerInput = {
  state: ReviewStateSnapshot;
  isCorrect: boolean;
  reviewedAt?: Date;
};

type GetReviewBucketsOptions = {
  userId: string;
  now?: Date;
};

type ReviewSchedulerDependencies = {
  getPoetryImage: (poetryId: string) => Promise<PoetryImage>;
};

export type ReviewBuckets = {
  todayDue: ReviewStateSnapshot[];
  upcoming: ReviewStateSnapshot[];
  recentWrong: ReviewStateSnapshot[];
};

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function buildPlaceholderImage(poetryId: string): PoetryImage {
  return {
    poetryId,
    imagePath: DEFAULT_POETRY_IMAGE_PATH,
    thumbPath: DEFAULT_POETRY_IMAGE_PATH,
    status: "placeholder",
    style: DEFAULT_IMAGE_STYLE,
    promptVersion: DEFAULT_PROMPT_VERSION,
    width: null,
    height: null,
    isPlaceholder: true,
  };
}

async function toSnapshot(
  record: ReviewStateRecord,
  dependencies: ReviewSchedulerDependencies,
): Promise<ReviewStateSnapshot> {
  const image = await dependencies.getPoetryImage(record.poetryId);

  return {
    userId: record.userId,
    poetryId: record.poetryId,
    mastery: record.mastery,
    reviewStage: record.reviewStage,
    currentIntervalDays: record.currentIntervalDays,
    lastReviewedAt: record.lastReviewedAt,
    nextReviewAt: record.nextReviewAt,
    wrongCount: record.wrongCount,
    consecutiveWrongCount: record.consecutiveWrongCount,
    title: record.poetry.title,
    author: record.poetry.author,
    previewLine: toStringArray(record.poetry.lines)[0] ?? "",
    image,
  };
}

function clampStage(stage: number) {
  return Math.max(0, Math.min(stage, REVIEW_INTERVAL_SEQUENCE.length - 1));
}

export function createInitialReviewState(
  input: CreateInitialReviewStateInput,
): Omit<ReviewStateSnapshot, "title" | "author" | "previewLine" | "image"> {
  const studiedAt = input.studiedAt ?? new Date();

  return {
    userId: input.userId,
    poetryId: input.poetryId,
    mastery: 0,
    reviewStage: 0,
    currentIntervalDays: 1,
    lastReviewedAt: studiedAt,
    nextReviewAt: addDays(studiedAt, 1),
    wrongCount: 0,
    consecutiveWrongCount: 0,
  };
}

export function updateReviewStateAfterAnswer(
  input: UpdateReviewStateAfterAnswerInput,
): ReviewStateSnapshot {
  const reviewedAt = input.reviewedAt ?? new Date();

  if (input.isCorrect) {
    const nextStage = clampStage(input.state.reviewStage + 1);
    const nextInterval = REVIEW_INTERVAL_SEQUENCE[nextStage] ?? 30;

    return {
      ...input.state,
      mastery: input.state.mastery + 1,
      reviewStage: nextStage,
      currentIntervalDays: nextInterval,
      lastReviewedAt: reviewedAt,
      nextReviewAt: addDays(reviewedAt, nextInterval),
      consecutiveWrongCount: 0,
    };
  }

  const nextWrongCount = input.state.wrongCount + 1;
  const nextConsecutiveWrongCount = input.state.consecutiveWrongCount + 1;

  return {
    ...input.state,
    mastery: Math.max(0, input.state.mastery - 1),
    reviewStage: 0,
    currentIntervalDays: 1,
    lastReviewedAt: reviewedAt,
    nextReviewAt:
      nextConsecutiveWrongCount >= 3 ? reviewedAt : addDays(reviewedAt, 1),
    wrongCount: nextWrongCount,
    consecutiveWrongCount: nextConsecutiveWrongCount,
  };
}

export async function getReviewBuckets(
  repositoryOrOptions?: ReviewRepository | GetReviewBucketsOptions,
  maybeOptions?: GetReviewBucketsOptions,
  dependencies: ReviewSchedulerDependencies = { getPoetryImage },
): Promise<ReviewBuckets> {
  const repository =
    maybeOptions === undefined
      ? ((db as unknown as ReviewRepository) ?? {})
      : (repositoryOrOptions as ReviewRepository);
  const options =
    maybeOptions ?? (repositoryOrOptions as GetReviewBucketsOptions);
  const now = options.now ?? new Date();

  if (!repository.reviewState) {
    return {
      todayDue: [],
      upcoming: [],
      recentWrong: [],
    };
  }

  const records = await repository.reviewState.findMany({
    where: {
      userId: options.userId,
    },
    include: {
      poetry: {
        select: {
          title: true,
          author: true,
          lines: true,
        },
      },
    },
    orderBy: [{ wrongCount: "desc" }, { nextReviewAt: "asc" }],
  });

  const snapshots = await Promise.all(
    records.map((record) => toSnapshot(record, dependencies)),
  );
  const upcomingLimit = addDays(now, UPCOMING_WINDOW_DAYS);

  return {
    todayDue: snapshots
      .filter((item) => item.nextReviewAt && item.nextReviewAt <= now)
      .sort((left, right) => {
        if (right.wrongCount !== left.wrongCount) {
          return right.wrongCount - left.wrongCount;
        }

        return (left.nextReviewAt?.getTime() ?? 0) - (right.nextReviewAt?.getTime() ?? 0);
      }),
    upcoming: snapshots.filter((item) => {
      return (
        item.nextReviewAt !== null &&
        item.nextReviewAt > now &&
        item.nextReviewAt <= upcomingLimit
      );
    }),
    recentWrong: snapshots.filter((item) => item.wrongCount > 0).slice(0, 5),
  };
}

export function buildReviewSummary(buckets: ReviewBuckets) {
  return {
    suggestedCount: buckets.todayDue.length,
    upcomingCount: buckets.upcoming.length,
    recentWrong: buckets.recentWrong,
  };
}

export async function syncReviewStateFromLearningEvent(
  input: {
    poetryId: string;
    eventType: "view_poetry" | "challenge_correct" | "challenge_wrong";
    occurredAt?: Date;
  },
  repository?: ReviewRepository,
) {
  const targetRepository = repository ?? (db as unknown as ReviewRepository);
  const userId = process.env.SYSTEM_USER_ID;

  if (!userId || !targetRepository.reviewState?.upsert) {
    return;
  }

  const occurredAt = input.occurredAt ?? new Date();

  if (input.eventType === "view_poetry") {
    const initialState = createInitialReviewState({
      userId,
      poetryId: input.poetryId,
      studiedAt: occurredAt,
    });

    await targetRepository.reviewState.upsert({
      where: {
        userId_poetryId: {
          userId,
          poetryId: input.poetryId,
        },
      },
      create: initialState,
      update: {
        mastery: initialState.mastery,
        reviewStage: initialState.reviewStage,
        currentIntervalDays: initialState.currentIntervalDays,
        lastReviewedAt: initialState.lastReviewedAt,
        nextReviewAt: initialState.nextReviewAt,
        wrongCount: initialState.wrongCount,
        consecutiveWrongCount: initialState.consecutiveWrongCount,
      },
    });

    return;
  }

  if (!targetRepository.reviewState.findUnique) {
    return;
  }

  const existing = await targetRepository.reviewState.findUnique({
    where: {
      userId_poetryId: {
        userId,
        poetryId: input.poetryId,
      },
    },
    include: {
      poetry: {
        select: {
          title: true,
          author: true,
          lines: true,
        },
      },
    },
  });

  const baseState = existing
    ? await toSnapshot(existing, {
        getPoetryImage: async (poetryId) => buildPlaceholderImage(poetryId),
      })
    : {
        ...createInitialReviewState({
          userId,
          poetryId: input.poetryId,
          studiedAt: occurredAt,
        }),
        title: "",
        author: "",
        previewLine: "",
        image: buildPlaceholderImage(input.poetryId),
      };
  const nextState = updateReviewStateAfterAnswer({
    state: baseState,
    isCorrect: input.eventType === "challenge_correct",
    reviewedAt: occurredAt,
  });

  await targetRepository.reviewState.upsert({
    where: {
      userId_poetryId: {
        userId,
        poetryId: input.poetryId,
      },
    },
    create: {
      userId: nextState.userId,
      poetryId: nextState.poetryId,
      mastery: nextState.mastery,
      reviewStage: nextState.reviewStage,
      currentIntervalDays: nextState.currentIntervalDays,
      lastReviewedAt: nextState.lastReviewedAt,
      nextReviewAt: nextState.nextReviewAt,
      wrongCount: nextState.wrongCount,
      consecutiveWrongCount: nextState.consecutiveWrongCount,
    },
    update: {
      mastery: nextState.mastery,
      reviewStage: nextState.reviewStage,
      currentIntervalDays: nextState.currentIntervalDays,
      lastReviewedAt: nextState.lastReviewedAt,
      nextReviewAt: nextState.nextReviewAt,
      wrongCount: nextState.wrongCount,
      consecutiveWrongCount: nextState.consecutiveWrongCount,
    },
  });
}
