import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateChallengeAccuracy,
  getMyPageStats,
  getPoetAffinity,
  type MyPageSummary,
} from "@/lib/stats/affinity";

test("getPoetAffinity aggregates learning records by author and returns top five", async () => {
  const result = await getPoetAffinity("family-001", {
    learningRecord: {
      groupBy: async (args: unknown) => {
        assert.deepEqual(args, {
          by: ["poetryId"],
          where: { userId: "family-001" },
          _count: { poetryId: true },
          orderBy: {
            _count: {
              poetryId: "desc",
            },
          },
        });

        return [
          { poetryId: "p1", _count: { poetryId: 5 } },
          { poetryId: "p2", _count: { poetryId: 4 } },
          { poetryId: "p3", _count: { poetryId: 3 } },
          { poetryId: "p4", _count: { poetryId: 2 } },
          { poetryId: "p5", _count: { poetryId: 2 } },
          { poetryId: "p6", _count: { poetryId: 1 } },
        ];
      },
    },
    poetry: {
      findMany: async (args: unknown) => {
        assert.deepEqual(args, {
          where: {
            id: {
              in: ["p1", "p2", "p3", "p4", "p5", "p6"],
            },
          },
          select: {
            id: true,
            author: true,
          },
        });

        return [
          { id: "p1", author: "李白" },
          { id: "p2", author: "杜甫" },
          { id: "p3", author: "李白" },
          { id: "p4", author: "王维" },
          { id: "p5", author: "王维" },
          { id: "p6", author: "孟浩然" },
        ];
      },
    },
  });

  assert.deepEqual(result, [
    { author: "李白", count: 8 },
    { author: "杜甫", count: 4 },
    { author: "王维", count: 4 },
    { author: "孟浩然", count: 1 },
  ]);
});

test("getPoetAffinity returns an empty list when the user has no learning history", async () => {
  const result = await getPoetAffinity("family-001", {
    learningRecord: {
      groupBy: async () => [],
    },
    poetry: {
      findMany: async () => {
        assert.fail("poetry.findMany should not be called when there are no records");
      },
    },
  });

  assert.deepEqual(result, []);
});

test("getMyPageStats builds the profile summary with streak, unique views, favorites, and accuracy", async () => {
  const now = new Date("2026-05-29T10:00:00.000Z");
  const learningRecordCalls: unknown[] = [];
  const challengeAttemptCalls: unknown[] = [];

  const result = await getMyPageStats("family-001", {
    learningRecord: {
      findMany: async (args: unknown) => {
        learningRecordCalls.push(args);

        if (
          JSON.stringify(args) ===
          JSON.stringify({
            where: {
              userId: "family-001",
            },
            select: {
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          })
        ) {
          return [
            { createdAt: new Date("2026-05-29T03:00:00.000Z") },
            { createdAt: new Date("2026-05-28T04:00:00.000Z") },
            { createdAt: new Date("2026-05-27T05:00:00.000Z") },
            { createdAt: new Date("2026-05-27T01:00:00.000Z") },
            { createdAt: new Date("2026-05-25T08:00:00.000Z") },
          ];
        }

        assert.deepEqual(args, {
          where: {
            userId: "family-001",
            eventType: "view_poetry",
          },
          select: {
            poetryId: true,
          },
        });

        return [
          { poetryId: "p4" },
          { poetryId: "p1" },
          { poetryId: "p2" },
          { poetryId: "p3" },
          { poetryId: "p2" },
        ];
      },
    },
    favorite: {
      count: async (args: unknown) => {
        assert.deepEqual(args, {
          where: {
            userId: "family-001",
          },
        });

        return 7;
      },
    },
    challengeAttempt: {
      count: async (args: unknown) => {
        challengeAttemptCalls.push(args);

        if (
          JSON.stringify(args) ===
          JSON.stringify({
            where: {
              userId: "family-001",
              questionType: {
                not: "review_self_report",
              },
            },
          })
        ) {
          return 12;
        }

        assert.deepEqual(args, {
          where: {
            userId: "family-001",
            isCorrect: true,
            questionType: {
              not: "review_self_report",
            },
          },
        });

        return 9;
      },
    },
  }, { now });

  assert.deepEqual(learningRecordCalls, [
    {
      where: {
        userId: "family-001",
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    },
    {
      where: {
        userId: "family-001",
        eventType: "view_poetry",
      },
      select: {
        poetryId: true,
      },
    },
  ]);
  assert.deepEqual(challengeAttemptCalls, [
    {
      where: {
        userId: "family-001",
        questionType: {
          not: "review_self_report",
        },
      },
    },
    {
      where: {
        userId: "family-001",
        isCorrect: true,
        questionType: {
          not: "review_self_report",
        },
      },
    },
  ]);

  assert.deepEqual(result, {
    streakDays: 3,
    viewedPoetryCount: 4,
    favoriteCount: 7,
    challengeAccuracy: 75,
    challengeAttemptCount: 12,
  } satisfies MyPageSummary);
});

test("getMyPageStats returns zero accuracy and zero streak when there is no activity", async () => {
  const result = await getMyPageStats("family-001", {
    learningRecord: {
      findMany: async () => [],
    },
    favorite: {
      count: async () => 0,
    },
    challengeAttempt: {
      count: async () => 0,
    },
  });

  assert.deepEqual(result, {
    streakDays: 0,
    viewedPoetryCount: 0,
    favoriteCount: 0,
    challengeAccuracy: 0,
    challengeAttemptCount: 0,
  } satisfies MyPageSummary);
});

test("calculateChallengeAccuracy excludes review_self_report attempts", () => {
  assert.equal(
    calculateChallengeAccuracy([
      { questionType: "couplet", isCorrect: true },
      { questionType: "ordering", isCorrect: false },
      { questionType: "review_self_report", isCorrect: false },
      { questionType: "review_self_report", isCorrect: true },
    ]),
    50,
  );
});

test("getMyPageStats excludes review_self_report from challenge accuracy counts", async () => {
  const challengeAttemptCalls: unknown[] = [];

  const result = await getMyPageStats("family-001", {
    learningRecord: {
      findMany: async () => [],
    },
    favorite: {
      count: async () => 0,
    },
    challengeAttempt: {
      count: async (args: unknown) => {
        challengeAttemptCalls.push(args);

        if (
          JSON.stringify(args) ===
          JSON.stringify({
            where: {
              userId: "family-001",
              questionType: {
                not: "review_self_report",
              },
            },
          })
        ) {
          return 8;
        }

        assert.deepEqual(args, {
          where: {
            userId: "family-001",
            isCorrect: true,
            questionType: {
              not: "review_self_report",
            },
          },
        });

        return 6;
      },
    },
  });

  assert.deepEqual(challengeAttemptCalls, [
    {
      where: {
        userId: "family-001",
        questionType: {
          not: "review_self_report",
        },
      },
    },
    {
      where: {
        userId: "family-001",
        isCorrect: true,
        questionType: {
          not: "review_self_report",
        },
      },
    },
  ]);

  assert.equal(result.challengeAttemptCount, 8);
  assert.equal(result.challengeAccuracy, 75);
});
