import assert from "node:assert/strict";
import test from "node:test";

import {
  submitReviewSelfReport,
  syncReviewStateFromLearningEvent,
} from "@/lib/review/scheduler";

/**
 * Integration tests for the review self-report → DB write chain and
 * the challenge → review state sync chain.
 *
 * These tests verify the three-table write pattern:
 * 1. ChallengeAttempt.create (review_self_report)
 * 2. LearningRecord.create (review_correct / review_wrong)
 * 3. ReviewState.upsert (updated mastery, stage, interval)
 */

const baseNow = new Date("2026-05-29T08:00:00.000Z");

function createMockRepository() {
  const challengeAttemptCalls: unknown[] = [];
  const learningRecordCalls: unknown[] = [];
  const reviewStateUpsertCalls: unknown[] = [];
  const reviewStateFindUniqueCalls: string[] = [];

  const repository = {
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
    reviewState: {
      findMany: async () => [],
      findUnique: async (args: { where: { userId_poetryId: { poetryId: string } } }) => {
        reviewStateFindUniqueCalls.push(args.where.userId_poetryId.poetryId);
        return null;
      },
      upsert: async (args: unknown) => {
        reviewStateUpsertCalls.push(args);
        return {};
      },
    },
  };

  return {
    repository,
    challengeAttemptCalls,
    learningRecordCalls,
    reviewStateUpsertCalls,
    reviewStateFindUniqueCalls,
  };
}

test("submitReviewSelfReport writes three records for a correct (known) review", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const mock = createMockRepository();

  const result = await submitReviewSelfReport(
    {
      poetryId: "ts300-0001",
      isCorrect: true,
      reviewedAt: baseNow,
    },
    mock.repository,
  );

  // Should return the updated state
  assert.ok(result.nextState);
  assert.equal(result.nextState.poetryId, "ts300-0001");
  assert.equal(result.nextState.mastery, 1);
  assert.equal(result.nextState.reviewStage, 1);

  // Verify ChallengeAttempt write
  assert.equal(mock.challengeAttemptCalls.length, 1);
  assert.deepEqual(mock.challengeAttemptCalls[0], {
    data: {
      userId: "family-001",
      poetryId: "ts300-0001",
      questionType: "review_self_report",
      promptLineIndex: null,
      userAnswer: "known",
      isCorrect: true,
    },
  });

  // Verify LearningRecord write
  assert.equal(mock.learningRecordCalls.length, 1);
  assert.deepEqual(mock.learningRecordCalls[0], {
    data: {
      userId: "family-001",
      poetryId: "ts300-0001",
      eventType: "review_correct",
    },
  });

  // Verify ReviewState upsert
  assert.equal(mock.reviewStateUpsertCalls.length, 1);
  const upsert = mock.reviewStateUpsertCalls[0] as {
    where: { userId_poetryId: { userId: string; poetryId: string } };
    create: { mastery: number; reviewStage: number };
  };
  assert.equal(upsert.where.userId_poetryId.userId, "family-001");
  assert.equal(upsert.where.userId_poetryId.poetryId, "ts300-0001");
  assert.equal(upsert.create.mastery, 1);
  assert.equal(upsert.create.reviewStage, 1);

  process.env.SYSTEM_USER_ID = previousUserId;
});

test("submitReviewSelfReport writes three records for an incorrect (unknown) review", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const mock = createMockRepository();

  const result = await submitReviewSelfReport(
    {
      poetryId: "ts300-0002",
      isCorrect: false,
      reviewedAt: baseNow,
    },
    mock.repository,
  );

  assert.ok(result.nextState);
  assert.equal(result.nextState.mastery, 0);
  assert.equal(result.nextState.reviewStage, 0);
  assert.equal(result.nextState.consecutiveWrongCount, 1);
  assert.equal(result.nextState.wrongCount, 1);

  // ChallengeAttempt should record "unknown"
  assert.equal(mock.challengeAttemptCalls.length, 1);
  assert.equal(
    (mock.challengeAttemptCalls[0] as { data: { userAnswer: string } }).data.userAnswer,
    "unknown",
  );
  assert.equal(
    (mock.challengeAttemptCalls[0] as { data: { isCorrect: boolean } }).data.isCorrect,
    false,
  );

  // LearningRecord should be review_wrong
  assert.equal(mock.learningRecordCalls.length, 1);
  assert.equal(
    (mock.learningRecordCalls[0] as { data: { eventType: string } }).data.eventType,
    "review_wrong",
  );

  // ReviewState should reflect wrong answer
  assert.equal(mock.reviewStateUpsertCalls.length, 1);
  const upsert = mock.reviewStateUpsertCalls[0] as {
    create: { wrongCount: number; consecutiveWrongCount: number };
  };
  assert.equal(upsert.create.wrongCount, 1);
  assert.equal(upsert.create.consecutiveWrongCount, 1);

  process.env.SYSTEM_USER_ID = previousUserId;
});

test("submitReviewSelfReport returns null nextState when SYSTEM_USER_ID is missing", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  delete process.env.SYSTEM_USER_ID;

  const mock = createMockRepository();

  const result = await submitReviewSelfReport(
    {
      poetryId: "ts300-0001",
      isCorrect: true,
      reviewedAt: baseNow,
    },
    mock.repository,
  );

  assert.equal(result.nextState, null);
  assert.equal(mock.challengeAttemptCalls.length, 0);
  assert.equal(mock.learningRecordCalls.length, 0);
  assert.equal(mock.reviewStateUpsertCalls.length, 0);

  process.env.SYSTEM_USER_ID = previousUserId;
});

test("syncReviewStateFromLearningEvent creates initial state for view_poetry", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const mock = createMockRepository();

  await syncReviewStateFromLearningEvent(
    {
      poetryId: "ts300-0005",
      eventType: "view_poetry",
      occurredAt: baseNow,
    },
    mock.repository,
  );

  assert.equal(mock.reviewStateUpsertCalls.length, 1);
  const upsert = mock.reviewStateUpsertCalls[0] as {
    where: { userId_poetryId: { poetryId: string } };
    create: { mastery: number; reviewStage: number; currentIntervalDays: number };
  };
  assert.equal(upsert.where.userId_poetryId.poetryId, "ts300-0005");
  assert.equal(upsert.create.mastery, 0);
  assert.equal(upsert.create.reviewStage, 0);
  assert.equal(upsert.create.currentIntervalDays, 1);

  process.env.SYSTEM_USER_ID = previousUserId;
});

test("syncReviewStateFromLearningEvent advances review state for challenge_correct", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const mock = createMockRepository();

  await syncReviewStateFromLearningEvent(
    {
      poetryId: "ts300-0001",
      eventType: "challenge_correct",
      occurredAt: baseNow,
    },
    mock.repository,
  );

  // Should findUnique (to get current state) then upsert (to update)
  assert.equal(mock.reviewStateFindUniqueCalls.length, 1);
  assert.equal(mock.reviewStateFindUniqueCalls[0], "ts300-0001");
  assert.equal(mock.reviewStateUpsertCalls.length, 1);

  const upsert = mock.reviewStateUpsertCalls[0] as {
    create: { mastery: number; reviewStage: number; currentIntervalDays: number };
  };
  // Since findUnique returns null, it creates initial state then applies correct answer
  assert.equal(upsert.create.mastery, 1);
  assert.equal(upsert.create.reviewStage, 1);
  assert.equal(upsert.create.currentIntervalDays, 2);

  process.env.SYSTEM_USER_ID = previousUserId;
});

test("syncReviewStateFromLearningEvent resets review state for challenge_wrong", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const mock = createMockRepository();

  await syncReviewStateFromLearningEvent(
    {
      poetryId: "ts300-0001",
      eventType: "challenge_wrong",
      occurredAt: baseNow,
    },
    mock.repository,
  );

  assert.equal(mock.reviewStateUpsertCalls.length, 1);
  const upsert = mock.reviewStateUpsertCalls[0] as {
    create: { mastery: number; reviewStage: number; wrongCount: number; consecutiveWrongCount: number };
  };
  // Initial state (mastery=0) + wrong answer: mastery stays 0, stage stays 0, wrong count increments
  assert.equal(upsert.create.mastery, 0);
  assert.equal(upsert.create.reviewStage, 0);
  assert.equal(upsert.create.wrongCount, 1);
  assert.equal(upsert.create.consecutiveWrongCount, 1);

  process.env.SYSTEM_USER_ID = previousUserId;
});

test("syncReviewStateFromLearningEvent is a no-op when SYSTEM_USER_ID is missing", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  delete process.env.SYSTEM_USER_ID;

  const mock = createMockRepository();

  await syncReviewStateFromLearningEvent(
    {
      poetryId: "ts300-0001",
      eventType: "challenge_correct",
      occurredAt: baseNow,
    },
    mock.repository,
  );

  assert.equal(mock.reviewStateUpsertCalls.length, 0);

  process.env.SYSTEM_USER_ID = previousUserId;
});
