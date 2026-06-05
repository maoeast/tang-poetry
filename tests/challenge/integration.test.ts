import assert from "node:assert/strict";
import test from "node:test";

import {
  submitChallengeAnswer,
  type ChallengeQuestion,
} from "@/lib/challenge/engine";

/**
 * Integration tests for the challenge submission → DB write chain.
 *
 * These tests verify that submitChallengeAnswer correctly:
 * 1. Creates a ChallengeAttempt record
 * 2. Creates a LearningRecord with the right event type
 * 3. Produces the correct isCorrect / normalizedAnswer result
 *
 * The review state sync (syncReviewStateFromLearningEvent) is only called
 * when no custom repository is provided (production path), so it's tested
 * separately in the degradation tests.
 */

function coupletQuestion(overrides: {
  id?: string;
  poetryId?: string;
  promptLineIndex?: number;
  expectedAnswer?: string;
} = {}): ChallengeQuestion {
  return {
    id: "question-couplet-1",
    poetryId: "ts300-0002",
    type: "couplet",
    title: "补全下句",
    prompt: "春眠不觉晓，",
    promptLineIndex: 0,
    expectedAnswer: "处处闻啼鸟。",
    ...overrides,
  };
}

function authorQuestion(): ChallengeQuestion {
  return {
    id: "author-ts300-0001",
    poetryId: "ts300-0001",
    type: "author",
    title: "这首诗是谁写的",
    prompt: "静夜思",
    expectedAnswer: "李白",
    options: ["杜甫", "李白", "白居易", "王维"],
  };
}

function titleQuestion(): ChallengeQuestion {
  return {
    id: "title-ts300-0003",
    poetryId: "ts300-0003",
    type: "title",
    title: "下面哪一个是这首诗的题目",
    prompt: "白日依山尽，",
    expectedAnswer: "登鹳雀楼",
    options: ["登鹳雀楼", "望庐山瀑布", "凉州词", "出塞"],
  };
}

function orderingQuestion(): ChallengeQuestion {
  return {
    id: "ordering-ts300-0001",
    poetryId: "ts300-0001",
    type: "ordering",
    title: "把诗句排成正确顺序",
    prompt: "静夜思 · 李白",
    expectedAnswer: ["床前明月光，", "疑是地上霜。", "举头望明月，", "低头思故乡。"],
    options: ["举头望明月，", "床前明月光，", "低头思故乡。", "疑是地上霜。"],
  };
}

test("submitChallengeAnswer writes correct records for wrong couplet answers", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const challengeAttemptCalls: unknown[] = [];
  const learningRecordCalls: unknown[] = [];

  const result = await submitChallengeAnswer(
    {
      question: coupletQuestion(),
      userAnswer: "处处闻风雨",
    },
    {
      poetry: { findMany: async () => [] },
      challengeAttempt: {
        create: async (args: unknown) => {
          challengeAttemptCalls.push(args);
          return {};
        },
      },
      learningRecord: {
        create: async (args: unknown) => {
          learningRecordCalls.push(args);
          return {};
        },
      },
    },
  );

  assert.equal(result.isCorrect, false);
  assert.equal(result.normalizedAnswer, "处处闻风雨");

  assert.equal(challengeAttemptCalls.length, 1);
  assert.deepEqual(challengeAttemptCalls[0], {
    data: {
      userId: "family-001",
      poetryId: "ts300-0002",
      questionType: "couplet",
      promptLineIndex: 0,
      userAnswer: "处处闻风雨",
      isCorrect: false,
    },
  });

  assert.equal(learningRecordCalls.length, 1);
  assert.deepEqual(learningRecordCalls[0], {
    data: {
      userId: "family-001",
      poetryId: "ts300-0002",
      eventType: "challenge_wrong",
    },
  });

  process.env.SYSTEM_USER_ID = previousUserId;
});

test("submitChallengeAnswer writes records for author questions with correct answer", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const challengeAttemptCalls: unknown[] = [];
  const learningRecordCalls: unknown[] = [];

  const result = await submitChallengeAnswer(
    {
      question: authorQuestion(),
      userAnswer: "李白",
    },
    {
      poetry: { findMany: async () => [] },
      challengeAttempt: {
        create: async (args: unknown) => {
          challengeAttemptCalls.push(args);
          return {};
        },
      },
      learningRecord: {
        create: async (args: unknown) => {
          learningRecordCalls.push(args);
          return {};
        },
      },
    },
  );

  assert.equal(result.isCorrect, true);
  assert.equal(challengeAttemptCalls.length, 1);
  assert.equal(
    (challengeAttemptCalls[0] as { data: { questionType: string } }).data.questionType,
    "author",
  );
  assert.equal(learningRecordCalls.length, 1);
  assert.equal(
    (learningRecordCalls[0] as { data: { eventType: string } }).data.eventType,
    "challenge_correct",
  );

  process.env.SYSTEM_USER_ID = previousUserId;
});

test("submitChallengeAnswer writes records for title questions with wrong answer", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const challengeAttemptCalls: unknown[] = [];
  const learningRecordCalls: unknown[] = [];

  const result = await submitChallengeAnswer(
    {
      question: titleQuestion(),
      userAnswer: "望庐山瀑布",
    },
    {
      poetry: { findMany: async () => [] },
      challengeAttempt: {
        create: async (args: unknown) => {
          challengeAttemptCalls.push(args);
          return {};
        },
      },
      learningRecord: {
        create: async (args: unknown) => {
          learningRecordCalls.push(args);
          return {};
        },
      },
    },
  );

  assert.equal(result.isCorrect, false);
  assert.equal(challengeAttemptCalls.length, 1);
  assert.equal(
    (challengeAttemptCalls[0] as { data: { questionType: string } }).data.questionType,
    "title",
  );
  assert.equal(learningRecordCalls.length, 1);
  assert.equal(
    (learningRecordCalls[0] as { data: { eventType: string } }).data.eventType,
    "challenge_wrong",
  );

  process.env.SYSTEM_USER_ID = previousUserId;
});

test("submitChallengeAnswer serializes ordering answers with pipe delimiter", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const challengeAttemptCalls: unknown[] = [];

  const result = await submitChallengeAnswer(
    {
      question: orderingQuestion(),
      userAnswer: ["床前明月光，", "疑是地上霜。", "举头望明月，", "低头思故乡。"],
    },
    {
      poetry: { findMany: async () => [] },
      challengeAttempt: {
        create: async (args: unknown) => {
          challengeAttemptCalls.push(args);
          return {};
        },
      },
      learningRecord: {
        create: async () => ({}),
      },
    },
  );

  assert.equal(result.isCorrect, true);
  // normalizeAnswer strips punctuation before pipe-joining
  assert.equal(
    (challengeAttemptCalls[0] as { data: { userAnswer: string } }).data.userAnswer,
    "床前明月光|疑是地上霜|举头望明月|低头思故乡",
  );

  process.env.SYSTEM_USER_ID = previousUserId;
});

test("submitChallengeAnswer skips DB writes when SYSTEM_USER_ID is missing", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  delete process.env.SYSTEM_USER_ID;

  const challengeAttemptCalls: unknown[] = [];
  const learningRecordCalls: unknown[] = [];

  const result = await submitChallengeAnswer(
    {
      question: coupletQuestion(),
      userAnswer: "处处闻啼鸟",
    },
    {
      poetry: { findMany: async () => [] },
      challengeAttempt: {
        create: async (args: unknown) => {
          challengeAttemptCalls.push(args);
          return {};
        },
      },
      learningRecord: {
        create: async (args: unknown) => {
          learningRecordCalls.push(args);
          return {};
        },
      },
    },
  );

  // Judgment still works — it's a pure function
  assert.equal(result.isCorrect, true);
  // But no DB writes happen
  assert.equal(challengeAttemptCalls.length, 0);
  assert.equal(learningRecordCalls.length, 0);

  process.env.SYSTEM_USER_ID = previousUserId;
});

test("submitChallengeAnswer handles multiple sequential submissions independently", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const allAttempts: { poetryId: string; isCorrect: boolean; questionType: string }[] = [];
  const allRecords: { poetryId: string; eventType: string }[] = [];

  const repository = {
    poetry: { findMany: async () => [] },
    challengeAttempt: {
      create: async (args: { data: { poetryId: string; isCorrect: boolean; questionType: string } }) => {
        allAttempts.push(args.data);
        return {};
      },
    },
    learningRecord: {
      create: async (args: { data: { poetryId: string; eventType: string } }) => {
        allRecords.push(args.data);
        return {};
      },
    },
  };

  // Simulate a 5-question round: couplet correct, couplet wrong, author correct, title wrong, ordering correct
  await submitChallengeAnswer(
    { question: coupletQuestion(), userAnswer: "处处闻啼鸟。" },
    repository,
  );
  await submitChallengeAnswer(
    { question: coupletQuestion({ poetryId: "ts300-0003", promptLineIndex: 0, expectedAnswer: "黄河入海流。" }), userAnswer: "黄河入海流。" },
    repository,
  );
  await submitChallengeAnswer(
    { question: authorQuestion(), userAnswer: "李白" },
    repository,
  );
  await submitChallengeAnswer(
    { question: titleQuestion(), userAnswer: "望庐山瀑布" },
    repository,
  );
  await submitChallengeAnswer(
    {
      question: orderingQuestion(),
      userAnswer: ["床前明月光，", "疑是地上霜。", "举头望明月，", "低头思故乡。"],
    },
    repository,
  );

  assert.equal(allAttempts.length, 5);
  assert.equal(allRecords.length, 5);

  // Verify the correct/wrong pattern
  assert.deepEqual(
    allAttempts.map((a) => a.isCorrect),
    [true, true, true, false, true],
  );
  assert.deepEqual(
    allRecords.map((r) => r.eventType),
    ["challenge_correct", "challenge_correct", "challenge_correct", "challenge_wrong", "challenge_correct"],
  );

  process.env.SYSTEM_USER_ID = previousUserId;
});
