import assert from "node:assert/strict";
import test from "node:test";

import { recordPoetryView } from "@/lib/poetry/repository";
import { getDailyPoetry } from "@/lib/poetry/daily";
import { submitChallengeAnswer } from "@/lib/challenge/engine";
import {
  submitReviewSelfReport,
  syncReviewStateFromLearningEvent,
} from "@/lib/review/scheduler";
import { getMyPageStats, getPoetAffinity } from "@/lib/stats/affinity";

/**
 * Degradation tests: verify graceful behavior when SYSTEM_USER_ID is missing.
 *
 * Per CLAUDE.md, Phase 1 uses a fixed SYSTEM_USER_ID. If it's absent (misconfigured
 * env), all write paths should silently skip, and read paths should return safe defaults
 * rather than throwing errors.
 *
 * Tested degradation points:
 * 1. recordPoetryView → returns without writing LearningRecord
 * 2. getDailyPoetry → returns isReadToday: false
 * 3. submitChallengeAnswer → returns judgment but no DB writes
 * 4. submitReviewSelfReport → returns { nextState: null }
 * 5. syncReviewStateFromLearningEvent → returns without writing ReviewState
 * 6. getMyPageStats → returns all-zero summary
 * 7. getPoetAffinity → returns empty array
 */

function saveUserId(): string | undefined {
  return process.env.SYSTEM_USER_ID;
}

function restoreUserId(previous: string | undefined) {
  if (previous === undefined) {
    delete process.env.SYSTEM_USER_ID;
  } else {
    process.env.SYSTEM_USER_ID = previous;
  }
}

// --- 1. recordPoetryView ---

test("recordPoetryView skips DB writes when SYSTEM_USER_ID is missing", async () => {
  const previous = saveUserId();
  delete process.env.SYSTEM_USER_ID;

  let writeCount = 0;

  await recordPoetryView(
    "ts300-0001",
    {
      learningRecord: {
        findMany: async () => [],
        create: async () => {
          writeCount += 1;
          return {};
        },
      },
    },
    { now: new Date("2026-05-29T09:00:00.000Z") },
  );

  assert.equal(writeCount, 0, "should not write any LearningRecord");

  restoreUserId(previous);
});

// --- 2. getDailyPoetry ---

test("getDailyPoetry returns isReadToday=false when SYSTEM_USER_ID is missing", async () => {
  const previous = saveUserId();
  delete process.env.SYSTEM_USER_ID;

  const result = await getDailyPoetry(
    "2026-05-29",
    {
      dailyPoetry: {
        findUnique: async () => ({
          date: "2026-05-29",
          poetry: {
            id: "ts300-0001",
            title: "在狱咏蝉",
            titleOriginal: "在嶽詠蟬",
            titleZhHans: "在狱咏蝉",
            titleZhHant: "在嶽詠蟬",
            author: "骆宾王",
            authorOriginal: "駱賓王",
            authorZhHans: "骆宾王",
            authorZhHant: "駱賓王",
            dynasty: "唐",
            lines: ["西陆蝉声唱，南冠客思侵。"],
            linesZhHans: ["西陆蝉声唱，南冠客思侵。"],
            linesZhHant: ["西陸蟬聲唱，南冠客思侵。"],
            imageKey: "ts300-0001",
            imageStatus: "placeholder",
          },
        }),
      },
    },
    {
      getPoetryImage: async () => ({
        poetryId: "ts300-0001",
        imagePath: "/images/placeholders/default-poetry-card.jpg",
        thumbPath: "/images/placeholders/default-poetry-card.jpg",
        status: "placeholder",
        style: "storybook-watercolor",
        promptVersion: "v1",
        width: null,
        height: null,
        isPlaceholder: true,
      }),
    },
    {
      now: new Date("2026-05-29T09:00:00.000Z"),
      scriptVariant: "zh-Hans",
    },
  );

  assert.ok(result);
  assert.equal(result.isReadToday, false, "should report as unread when no user");

  restoreUserId(previous);
});

// --- 3. submitChallengeAnswer ---

test("submitChallengeAnswer returns judgment but skips DB writes when SYSTEM_USER_ID is missing", async () => {
  const previous = saveUserId();
  delete process.env.SYSTEM_USER_ID;

  let writeCount = 0;

  const result = await submitChallengeAnswer(
    {
      question: {
        id: "couplet-1",
        poetryId: "ts300-0002",
        type: "couplet",
        title: "补全下句",
        prompt: "春眠不觉晓，",
        promptLineIndex: 0,
        expectedAnswer: "处处闻啼鸟。",
      },
      userAnswer: "处处闻啼鸟",
    },
    {
      poetry: { findMany: async () => [] },
      challengeAttempt: {
        create: async () => {
          writeCount += 1;
          return {};
        },
      },
      learningRecord: {
        create: async () => {
          writeCount += 1;
          return {};
        },
      },
    },
  );

  // Judgment still works
  assert.equal(result.isCorrect, true);
  // But no DB writes
  assert.equal(writeCount, 0, "should not write ChallengeAttempt or LearningRecord");

  restoreUserId(previous);
});

// --- 4. submitReviewSelfReport ---

test("submitReviewSelfReport returns null nextState when SYSTEM_USER_ID is missing", async () => {
  const previous = saveUserId();
  delete process.env.SYSTEM_USER_ID;

  let writeCount = 0;

  const result = await submitReviewSelfReport(
    {
      poetryId: "ts300-0001",
      isCorrect: true,
      reviewedAt: new Date("2026-05-29T08:00:00.000Z"),
    },
    {
      challengeAttempt: {
        create: async () => {
          writeCount += 1;
          return {};
        },
      },
      learningRecord: {
        create: async () => {
          writeCount += 1;
          return {};
        },
      },
      reviewState: {
        findMany: async () => [],
        findUnique: async () => null,
        upsert: async () => {
          writeCount += 1;
          return {};
        },
      },
    },
  );

  assert.equal(result.nextState, null);
  assert.equal(writeCount, 0, "should not write any records");

  restoreUserId(previous);
});

// --- 5. syncReviewStateFromLearningEvent ---

test("syncReviewStateFromLearningEvent is a no-op when SYSTEM_USER_ID is missing", async () => {
  const previous = saveUserId();
  delete process.env.SYSTEM_USER_ID;

  let upsertCount = 0;

  await syncReviewStateFromLearningEvent(
    {
      poetryId: "ts300-0001",
      eventType: "view_poetry",
      occurredAt: new Date("2026-05-29T08:00:00.000Z"),
    },
    {
      reviewState: {
        findMany: async () => [],
        findUnique: async () => null,
        upsert: async () => {
          upsertCount += 1;
          return {};
        },
      },
    },
  );

  assert.equal(upsertCount, 0, "should not upsert any ReviewState");

  restoreUserId(previous);
});

// --- 6. getMyPageStats ---

test("getMyPageStats returns all-zero summary when repository has no data", async () => {
  const summary = await getMyPageStats("family-001", {
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

  assert.equal(summary.streakDays, 0);
  assert.equal(summary.viewedPoetryCount, 0);
  assert.equal(summary.favoriteCount, 0);
  assert.equal(summary.challengeAccuracy, 0);
  assert.equal(summary.challengeAttemptCount, 0);
});

// --- 7. getPoetAffinity ---

test("getPoetAffinity returns empty array when repository has no data", async () => {
  const affinity = await getPoetAffinity("family-001", {
    learningRecord: {
      groupBy: async () => [],
    },
    poetry: {
      findMany: async () => [],
    },
  });

  assert.deepEqual(affinity, []);
});
