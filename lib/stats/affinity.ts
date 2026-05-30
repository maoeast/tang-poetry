import { db } from "@/lib/db";

export type PoetAffinity = {
  author: string;
  count: number;
};

export type MyPageSummary = {
  streakDays: number;
  viewedPoetryCount: number;
  favoriteCount: number;
  challengeAccuracy: number;
  challengeAttemptCount: number;
};

type ChallengeAccuracyAttempt = {
  questionType: string;
  isCorrect: boolean;
};

type LearningRecordGroup = {
  poetryId: string;
  _count: {
    poetryId: number;
  };
};

type AffinityRepository = {
  learningRecord?: {
    groupBy?: (args: {
      by: ["poetryId"];
      where: {
        userId: string;
      };
      _count: {
        poetryId: true;
      };
      orderBy: {
        _count: {
          poetryId: "desc";
        };
      };
    }) => Promise<LearningRecordGroup[]>;
    findMany?: (args: {
      where: {
        userId: string;
      } | {
        userId: string;
        eventType: "view_poetry";
      };
      select: {
        createdAt: true;
      } | {
        poetryId: true;
      };
      orderBy?: {
        createdAt: "desc";
      };
    }) => Promise<Array<{ createdAt?: Date; poetryId?: string }>>;
  };
  poetry?: {
    findMany: (args: {
      where: {
        id: {
          in: string[];
        };
      };
      select: {
        id: true;
        author: true;
      };
    }) => Promise<Array<{ id: string; author: string }>>;
  };
  favorite?: {
    count: (args: {
      where: {
        userId: string;
      };
    }) => Promise<number>;
  };
  challengeAttempt?: {
    count: (args: {
      where: {
        userId: string;
        questionType?: {
          not: string;
        };
      } | {
        userId: string;
        isCorrect: true;
        questionType?: {
          not: string;
        };
      };
    }) => Promise<number>;
  };
};

type GetMyPageStatsOptions = {
  now?: Date;
};

function startOfUtcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function calculateStreakDays(
  timestamps: Array<{ createdAt?: Date }>,
  now: Date,
) {
  const dayKeys = Array.from(
    new Set(
      timestamps
        .map((record) => record.createdAt)
        .filter((value): value is Date => value instanceof Date)
        .map((date) => startOfUtcDay(date)),
    ),
  ).sort((a, b) => b - a);

  if (dayKeys.length === 0) {
    return 0;
  }

  const todayKey = startOfUtcDay(now);
  const yesterdayKey = todayKey - 24 * 60 * 60 * 1000;

  if (dayKeys[0] !== todayKey && dayKeys[0] !== yesterdayKey) {
    return 0;
  }

  let streak = 1;
  let previousDayKey = dayKeys[0];

  for (let index = 1; index < dayKeys.length; index += 1) {
    const currentDayKey = dayKeys[index];

    if (previousDayKey - currentDayKey !== 24 * 60 * 60 * 1000) {
      break;
    }

    streak += 1;
    previousDayKey = currentDayKey;
  }

  return streak;
}

export function calculateChallengeAccuracy(
  attempts: ChallengeAccuracyAttempt[],
) {
  const includedAttempts = attempts.filter(
    (attempt) => attempt.questionType !== "review_self_report",
  );

  if (includedAttempts.length === 0) {
    return 0;
  }

  const correctAttemptCount = includedAttempts.filter(
    (attempt) => attempt.isCorrect,
  ).length;

  return Math.round((correctAttemptCount / includedAttempts.length) * 100);
}

function calculateChallengeAccuracyFromCounts(
  challengeAttemptCount: number,
  correctAttemptCount: number,
) {
  if (challengeAttemptCount <= 0) {
    return 0;
  }

  return Math.round((correctAttemptCount / challengeAttemptCount) * 100);
}

export async function getPoetAffinity(
  userId: string,
  repository?: AffinityRepository,
): Promise<PoetAffinity[]> {
  const targetRepository = repository ?? (db as unknown as AffinityRepository);

  if (!targetRepository.learningRecord?.groupBy || !targetRepository.poetry) {
    return [];
  }

  const grouped = await targetRepository.learningRecord.groupBy({
    by: ["poetryId"],
    where: { userId },
    _count: { poetryId: true },
    orderBy: {
      _count: {
        poetryId: "desc",
      },
    },
  });

  if (grouped.length === 0) {
    return [];
  }

  const poetryIds = grouped.map((item) => item.poetryId);
  const poetryList = await targetRepository.poetry.findMany({
    where: {
      id: {
        in: poetryIds,
      },
    },
    select: {
      id: true,
      author: true,
    },
  });
  const authorByPoetryId = new Map(poetryList.map((item) => [item.id, item.author]));
  const countByAuthor = new Map<string, number>();

  for (const item of grouped) {
    const author = authorByPoetryId.get(item.poetryId);

    if (!author) {
      continue;
    }

    countByAuthor.set(author, (countByAuthor.get(author) ?? 0) + item._count.poetryId);
  }

  return Array.from(countByAuthor.entries())
    .map(([author, count]) => ({ author, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.author.localeCompare(right.author, "zh-Hans-CN");
    })
    .slice(0, 5);
}

export async function getMyPageStats(
  userId: string,
  repository?: AffinityRepository,
  options?: GetMyPageStatsOptions,
): Promise<MyPageSummary> {
  const targetRepository = repository ?? (db as unknown as AffinityRepository);
  const now = options?.now ?? new Date();

  const [activityRecords, viewedRecords, favoriteCount, challengeAttemptCount, correctAttemptCount] =
    await Promise.all([
      targetRepository.learningRecord?.findMany
        ? targetRepository.learningRecord.findMany({
            where: {
              userId,
            },
            select: {
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          })
        : Promise.resolve([]),
      targetRepository.learningRecord?.findMany
        ? targetRepository.learningRecord.findMany({
            where: {
              userId,
              eventType: "view_poetry",
            },
            select: {
              poetryId: true,
            },
          })
        : Promise.resolve([]),
      targetRepository.favorite?.count
        ? targetRepository.favorite.count({
            where: {
              userId,
            },
          })
        : Promise.resolve(0),
      targetRepository.challengeAttempt?.count
        ? targetRepository.challengeAttempt.count({
            where: {
              userId,
              questionType: {
                not: "review_self_report",
              },
            },
          })
        : Promise.resolve(0),
      targetRepository.challengeAttempt?.count
        ? targetRepository.challengeAttempt.count({
            where: {
              userId,
              isCorrect: true,
              questionType: {
                not: "review_self_report",
              },
            },
          })
        : Promise.resolve(0),
    ]);

  const viewedPoetryCount = new Set(
    viewedRecords
      .map((record) => record.poetryId)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  ).size;
  const challengeAccuracy = calculateChallengeAccuracyFromCounts(
    challengeAttemptCount,
    correctAttemptCount,
  );

  return {
    streakDays: calculateStreakDays(activityRecords, now),
    viewedPoetryCount,
    favoriteCount,
    challengeAccuracy,
    challengeAttemptCount,
  };
}
