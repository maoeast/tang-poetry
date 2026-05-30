import assert from "node:assert/strict";
import test from "node:test";

import {
  CHALLENGE_ROUND_CONFIG,
  buildChallengeRound,
  getChallengePoetrySeeds,
  type ChallengePoetrySeed,
} from "@/lib/challenge/engine";

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
  {
    id: "ts300-0005",
    title: "鹿柴",
    author: "王维",
    dynasty: "唐",
    lines: ["空山不见人，", "但闻人语响。", "返景入深林，", "复照青苔上。"],
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

test("buildChallengeRound emits the configured question counts", () => {
  const round = buildChallengeRound(samplePoems, {
    random: createSequenceRandom([
      0.01, 0.11, 0.21, 0.31, 0.41, 0.51, 0.61, 0.71, 0.81, 0.91,
      0.02, 0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72, 0.82, 0.92,
    ]),
  });

  assert.equal(round.questions.length, CHALLENGE_ROUND_CONFIG.total);

  const counts = round.questions.reduce<Record<string, number>>((accumulator, question) => {
    accumulator[question.type] = (accumulator[question.type] ?? 0) + 1;
    return accumulator;
  }, {});

  assert.deepEqual(counts, {
    couplet: CHALLENGE_ROUND_CONFIG.couplet,
    author: CHALLENGE_ROUND_CONFIG.author,
    title: CHALLENGE_ROUND_CONFIG.title,
    ordering: CHALLENGE_ROUND_CONFIG.ordering,
  });
});

test("buildChallengeRound honors review mode before poetryId mode", () => {
  const round = buildChallengeRound(samplePoems, {
    mode: "review",
    reviewPoetryIds: ["ts300-0003", "ts300-0004"],
    poetryId: "ts300-0001",
    random: createSequenceRandom([
      0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95,
    ]),
  });

  assert.equal(round.questions.length, CHALLENGE_ROUND_CONFIG.total);
  assert.deepEqual(
    Array.from(new Set(round.questions.map((question) => question.poetryId))).sort(),
    ["ts300-0003", "ts300-0004"],
  );
});

test("buildChallengeRound prioritizes the requested poetryId in default mode", () => {
  const round = buildChallengeRound(samplePoems, {
    poetryId: "ts300-0002",
    random: createSequenceRandom([
      0.07, 0.17, 0.27, 0.37, 0.47, 0.57, 0.67, 0.77, 0.87, 0.97,
    ]),
  });

  assert.equal(round.questions[0]?.poetryId, "ts300-0002");
  assert.equal(round.questions[0]?.type, "couplet");
});

test("getChallengePoetrySeeds returns review pool items first in review mode", async () => {
  const seeds = await getChallengePoetrySeeds(
    {
      poetry: {
        findMany: async () => [
          {
            id: "ts300-0001",
            title: "静夜思",
            author: "李白",
            dynasty: "唐",
            lines: ["床前明月光，", "疑是地上霜。"],
          },
          {
            id: "ts300-0002",
            title: "春晓",
            author: "孟浩然",
            dynasty: "唐",
            lines: ["春眠不觉晓，", "处处闻啼鸟。"],
          },
          {
            id: "ts300-0003",
            title: "登鹳雀楼",
            author: "王之涣",
            dynasty: "唐",
            lines: ["白日依山尽，", "黄河入海流。"],
          },
        ],
      },
      reviewState: {
        findMany: async () => [
          { poetryId: "ts300-0003" },
          { poetryId: "ts300-0002" },
        ],
      },
    },
    {
      mode: "review",
    },
  );

  assert.deepEqual(
    seeds.map((seed) => seed.id),
    ["ts300-0003", "ts300-0002", "ts300-0001"],
  );
});
