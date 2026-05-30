import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReviewSummary,
  createInitialReviewState,
  getReviewBuckets,
  updateReviewStateAfterAnswer,
  type ReviewStateSnapshot,
} from "@/lib/review/scheduler";

const baseNow = new Date("2026-05-29T08:00:00.000Z");

function createState(overrides: Partial<ReviewStateSnapshot> = {}): ReviewStateSnapshot {
  return {
    userId: "family-001",
    poetryId: "ts300-0001",
    mastery: 0,
    reviewStage: 0,
    currentIntervalDays: 1,
    lastReviewedAt: null,
    nextReviewAt: new Date("2026-05-30T08:00:00.000Z"),
    wrongCount: 0,
    consecutiveWrongCount: 0,
    title: "静夜思",
    author: "李白",
    previewLine: "床前明月光，",
    image: {
      poetryId: "ts300-0001",
      imagePath: "/images/placeholders/default-poetry-card.jpg",
      thumbPath: "/images/placeholders/default-poetry-card.jpg",
      status: "placeholder",
      style: "storybook-watercolor",
      promptVersion: "v1",
      width: null,
      height: null,
      isPlaceholder: true,
    },
    ...overrides,
  };
}

test("createInitialReviewState schedules first review for the next day", () => {
  const state = createInitialReviewState({
    userId: "family-001",
    poetryId: "ts300-0001",
    studiedAt: baseNow,
  });

  assert.equal(state.mastery, 0);
  assert.equal(state.reviewStage, 0);
  assert.equal(state.currentIntervalDays, 1);
  assert.equal(state.wrongCount, 0);
  assert.equal(state.consecutiveWrongCount, 0);
  assert.equal(state.nextReviewAt.toISOString(), "2026-05-30T08:00:00.000Z");
});

test("updateReviewStateAfterAnswer advances intervals with the fixed sequence on correct answers", () => {
  const firstCorrect = updateReviewStateAfterAnswer({
    state: createState(),
    isCorrect: true,
    reviewedAt: baseNow,
  });

  assert.equal(firstCorrect.reviewStage, 1);
  assert.equal(firstCorrect.currentIntervalDays, 2);
  assert.equal(firstCorrect.mastery, 1);
  assert.equal(firstCorrect.consecutiveWrongCount, 0);
  assert.equal(firstCorrect.nextReviewAt?.toISOString(), "2026-05-31T08:00:00.000Z");

  const capped = updateReviewStateAfterAnswer({
    state: createState({
      reviewStage: 4,
      currentIntervalDays: 15,
      mastery: 4,
    }),
    isCorrect: true,
    reviewedAt: baseNow,
  });

  assert.equal(capped.reviewStage, 5);
  assert.equal(capped.currentIntervalDays, 30);
  assert.equal(capped.nextReviewAt?.toISOString(), "2026-06-28T08:00:00.000Z");
});

test("updateReviewStateAfterAnswer resets to next day and decreases mastery on wrong answers", () => {
  const updated = updateReviewStateAfterAnswer({
    state: createState({
      mastery: 2,
      reviewStage: 3,
      currentIntervalDays: 7,
    }),
    isCorrect: false,
    reviewedAt: baseNow,
  });

  assert.equal(updated.mastery, 1);
  assert.equal(updated.reviewStage, 0);
  assert.equal(updated.currentIntervalDays, 1);
  assert.equal(updated.wrongCount, 1);
  assert.equal(updated.consecutiveWrongCount, 1);
  assert.equal(updated.nextReviewAt?.toISOString(), "2026-05-30T08:00:00.000Z");
});

test("updateReviewStateAfterAnswer forces same-day review after three consecutive wrong answers", () => {
  const updated = updateReviewStateAfterAnswer({
    state: createState({
      mastery: 1,
      wrongCount: 2,
      consecutiveWrongCount: 2,
    }),
    isCorrect: false,
    reviewedAt: baseNow,
  });

  assert.equal(updated.mastery, 0);
  assert.equal(updated.wrongCount, 3);
  assert.equal(updated.consecutiveWrongCount, 3);
  assert.equal(updated.nextReviewAt?.toISOString(), "2026-05-29T08:00:00.000Z");
});

test("getReviewBuckets returns due, upcoming and wrong-priority review items", async () => {
  const buckets = await getReviewBuckets(
    {
      reviewState: {
        findMany: async () => [
          {
            ...createState({
              poetryId: "ts300-0001",
              title: "静夜思",
              wrongCount: 0,
              nextReviewAt: new Date("2026-05-29T06:00:00.000Z"),
            }),
            poetry: {
              title: "静夜思",
              author: "李白",
              lines: ["床前明月光，"],
            },
          },
          {
            ...createState({
              poetryId: "ts300-0002",
              title: "春晓",
              wrongCount: 3,
              consecutiveWrongCount: 2,
              nextReviewAt: new Date("2026-05-29T07:00:00.000Z"),
            }),
            poetry: {
              title: "春晓",
              author: "孟浩然",
              lines: ["春眠不觉晓，"],
            },
          },
          {
            ...createState({
              poetryId: "ts300-0003",
              title: "登鹳雀楼",
              wrongCount: 1,
              nextReviewAt: new Date("2026-05-31T08:00:00.000Z"),
            }),
            poetry: {
              title: "登鹳雀楼",
              author: "王之涣",
              lines: ["白日依山尽，"],
            },
          },
        ],
      },
    },
    {
      userId: "family-001",
      now: baseNow,
    },
  );

  assert.deepEqual(
    buckets.todayDue.map((item) => item.poetryId),
    ["ts300-0002", "ts300-0001"],
  );
  assert.deepEqual(
    buckets.upcoming.map((item) => item.poetryId),
    ["ts300-0003"],
  );
  assert.deepEqual(
    buckets.recentWrong.map((item) => item.poetryId),
    ["ts300-0002", "ts300-0003"],
  );
});

test("getReviewBuckets attaches runtime images from ImageAsset and keeps placeholder fallback", async () => {
  const imageCalls: string[] = [];

  const buckets = await getReviewBuckets(
    {
      reviewState: {
        findMany: async () => [
          {
            ...createState({
              poetryId: "ts300-0001",
              title: "静夜思",
              nextReviewAt: new Date("2026-05-29T06:00:00.000Z"),
            }),
            poetry: {
              title: "静夜思",
              author: "李白",
              lines: ["床前明月光，"],
            },
          },
          {
            ...createState({
              poetryId: "ts300-0002",
              title: "春晓",
              wrongCount: 1,
              nextReviewAt: new Date("2026-05-30T08:00:00.000Z"),
            }),
            poetry: {
              title: "春晓",
              author: "孟浩然",
              lines: ["春眠不觉晓，"],
            },
          },
        ],
      },
    },
    {
      userId: "family-001",
      now: baseNow,
    },
    {
      getPoetryImage: async (poetryId: string) => {
        imageCalls.push(poetryId);

        if (poetryId === "ts300-0001") {
          return {
            poetryId,
            imagePath: "/images/generated/ts300-0001.jpg",
            thumbPath: "/images/generated/ts300-0001-thumb.jpg",
            status: "ready",
            style: "storybook-watercolor",
            promptVersion: "v1",
            width: 1200,
            height: 675,
            isPlaceholder: false,
          };
        }

        return {
          poetryId,
          imagePath: "/images/placeholders/default-poetry-card.jpg",
          thumbPath: "/images/placeholders/default-poetry-card.jpg",
          status: "placeholder",
          style: "storybook-watercolor",
          promptVersion: "v1",
          width: null,
          height: null,
          isPlaceholder: true,
        };
      },
    },
  );

  assert.deepEqual(imageCalls, ["ts300-0001", "ts300-0002"]);
  assert.equal(
    buckets.todayDue[0]?.image.thumbPath,
    "/images/generated/ts300-0001-thumb.jpg",
  );
  assert.equal(
    buckets.upcoming[0]?.image.imagePath,
    "/images/placeholders/default-poetry-card.jpg",
  );
  assert.equal(buckets.upcoming[0]?.image.isPlaceholder, true);
});

test("buildReviewSummary exposes suggested count and recent wrong items", () => {
  const summary = buildReviewSummary({
    todayDue: [
      createState({ poetryId: "ts300-0002", title: "春晓", wrongCount: 2 }),
      createState({ poetryId: "ts300-0001", title: "静夜思", wrongCount: 0 }),
    ],
    upcoming: [createState({ poetryId: "ts300-0003", title: "登鹳雀楼" })],
    recentWrong: [createState({ poetryId: "ts300-0002", title: "春晓", wrongCount: 2 })],
  });

  assert.equal(summary.suggestedCount, 2);
  assert.equal(summary.upcomingCount, 1);
  assert.equal(summary.recentWrong.length, 1);
  assert.equal(summary.recentWrong[0]?.poetryId, "ts300-0002");
});
