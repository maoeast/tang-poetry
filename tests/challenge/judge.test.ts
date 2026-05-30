import assert from "node:assert/strict";
import test from "node:test";

import {
  CHALLENGE_ROUND_CONFIG,
  buildChallengeRound,
  buildOrderingQuestion,
  submitChallengeAnswer,
  type ChallengePoetrySeed,
  type ChallengeQuestion,
} from "@/lib/challenge/engine";
import { judgeCouplet, normalizeAnswer } from "@/lib/challenge/judge";

const samplePoems: ChallengePoetrySeed[] = [
  {
    id: "ts300-0001",
    title: "静夜思",
    author: "李白",
    dynasty: "唐",
    lines: ["床前明月光，", "疑是地上霜。", "举头望明月，", "低头思故乡。"],
  },
  {
    id: "ts300-0002",
    title: "春晓",
    author: "孟浩然",
    dynasty: "唐",
    lines: ["春眠不觉晓，", "处处闻啼鸟。", "夜来风雨声，", "花落知多少。"],
  },
  {
    id: "ts300-0003",
    title: "登鹳雀楼",
    author: "王之涣",
    dynasty: "唐",
    lines: ["白日依山尽，", "黄河入海流。", "欲穷千里目，", "更上一层楼。"],
  },
  {
    id: "ts300-0004",
    title: "相思",
    author: "王维",
    dynasty: "唐",
    lines: ["红豆生南国，", "春来发几枝。", "愿君多采撷，", "此物最相思。"],
  },
];

function createSequenceRandom(values: number[]) {
  let index = 0;

  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

test("normalizeAnswer removes whitespace and punctuation", () => {
  assert.equal(normalizeAnswer("  春 眠，不觉 晓。\n"), "春眠不觉晓");
});

test("judgeCouplet returns false for a wrong answer", () => {
  assert.equal(judgeCouplet("处处闻风雨", "处处闻啼鸟"), false);
});

test("buildOrderingQuestion retries when shuffled lines match the original order", () => {
  const question = buildOrderingQuestion(samplePoems[0], {
    random: createSequenceRandom([
      0.99,
      0.99,
      0.99,
      0,
      0,
      0,
    ]),
  });

  assert.deepEqual(question.expectedAnswer, samplePoems[0].lines);
  assert.notDeepEqual(question.options, samplePoems[0].lines);
});

test("CHALLENGE_ROUND_CONFIG exports the fixed five-question allocation", () => {
  assert.deepEqual(CHALLENGE_ROUND_CONFIG, {
    total: 5,
    couplet: 2,
    author: 1,
    title: 1,
    ordering: 1,
  });
});

test("buildChallengeRound returns the five planned question types in sequence", () => {
  const round = buildChallengeRound(samplePoems, {
    random: createSequenceRandom([
      0.1,
      0.3,
      0.6,
      0.8,
      0.2,
      0.4,
      0.7,
      0.9,
      0.15,
      0.35,
      0.55,
      0.75,
    ]),
  });

  assert.deepEqual(
    round.questions.map((question) => question.type),
    ["couplet", "couplet", "author", "title", "ordering"],
  );
  assert.equal(round.questions.length, 5);
});

test("submitChallengeAnswer writes ChallengeAttempt and LearningRecord for correct answers", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const challengeAttemptCalls: unknown[] = [];
  const learningRecordCalls: unknown[] = [];

  const question: ChallengeQuestion = {
    id: "question-couplet-1",
    poetryId: "ts300-0002",
    type: "couplet",
    title: "补全下句",
    prompt: "春眠不觉晓，",
    promptLineIndex: 0,
    expectedAnswer: "处处闻啼鸟。",
  };

  const result = await submitChallengeAnswer(
    {
      question,
      userAnswer: " 处处闻啼鸟 ",
    },
    {
      poetry: {
        findMany: async () => [],
      },
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
  assert.deepEqual(challengeAttemptCalls, [
    {
      data: {
        userId: "family-001",
        poetryId: "ts300-0002",
        questionType: "couplet",
        promptLineIndex: 0,
        userAnswer: "处处闻啼鸟",
        isCorrect: true,
      },
    },
  ]);
  assert.deepEqual(learningRecordCalls, [
    {
      data: {
        userId: "family-001",
        poetryId: "ts300-0002",
        eventType: "challenge_correct",
      },
    },
  ]);

  process.env.SYSTEM_USER_ID = previousUserId;
});
