import assert from "node:assert/strict";
import test from "node:test";

import { handleExplainPoetry } from "@/app/api/ai/explain/route";

test("handleExplainPoetry returns cached explanation without calling DeepSeek", async () => {
  const explainCalls: unknown[] = [];
  const updateCalls: unknown[] = [];

  const response = await handleExplainPoetry(
    new Request("http://localhost/api/ai/explain", {
      method: "POST",
      body: JSON.stringify({
        poetryId: "ts300-0001",
        audience: "child",
      }),
      headers: {
        "content-type": "application/json",
      },
    }),
    {
      repository: {
        poetry: {
          findUnique: async () => ({
            id: "ts300-0001",
            title: "静夜思",
            author: "李白",
            lines: ["床前明月光。", "疑是地上霜。"],
            aiExplanation: {
              child_v1: {
                summary: "这是在月夜里想家的诗。",
                imagery: "像小朋友晚上看着月亮想家。",
                emotion: "安静里带着一点思念。",
                cachedAt: "2026-05-29T10:00:00.000Z",
              },
            },
          }),
          update: async (args: unknown) => {
            updateCalls.push(args);
            return {};
          },
        },
      },
      explainPoetryImpl: async (input) => {
        explainCalls.push(input);

        return {
          summary: "new",
          imagery: "new",
          emotion: "new",
          cachedAt: "2026-05-29T11:00:00.000Z",
        };
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    summary: "这是在月夜里想家的诗。",
    imagery: "像小朋友晚上看着月亮想家。",
    emotion: "安静里带着一点思念。",
    cachedAt: "2026-05-29T10:00:00.000Z",
  });
  assert.deepEqual(explainCalls, []);
  assert.deepEqual(updateCalls, []);
});

test("handleExplainPoetry calls DeepSeek and persists the explanation on cache miss", async () => {
  const explainCalls: unknown[] = [];
  const updateCalls: unknown[] = [];

  const response = await handleExplainPoetry(
    new Request("http://localhost/api/ai/explain", {
      method: "POST",
      body: JSON.stringify({
        poetryId: "ts300-0002",
        audience: "general",
      }),
      headers: {
        "content-type": "application/json",
      },
    }),
    {
      repository: {
        poetry: {
          findUnique: async () => ({
            id: "ts300-0002",
            title: "春晓",
            author: "孟浩然",
            lines: ["春眠不觉晓。", "处处闻啼鸟。"],
            aiExplanation: {
              child_v1: {
                summary: "旧缓存",
                imagery: "旧缓存",
                emotion: "旧缓存",
                cachedAt: "2026-05-29T09:00:00.000Z",
              },
            },
          }),
          update: async (args: unknown) => {
            updateCalls.push(args);
            return {};
          },
        },
      },
      explainPoetryImpl: async (input) => {
        explainCalls.push(input);

        return {
          summary: "这首诗从春天清晨醒来的听觉与感受入手。",
          imagery: "先写睡醒，再写鸟鸣和风雨后的花落。",
          emotion: "轻快里带着对春光流逝的体会。",
          cachedAt: "2026-05-29T12:00:00.000Z",
        };
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    summary: "这首诗从春天清晨醒来的听觉与感受入手。",
    imagery: "先写睡醒，再写鸟鸣和风雨后的花落。",
    emotion: "轻快里带着对春光流逝的体会。",
    cachedAt: "2026-05-29T12:00:00.000Z",
  });
  assert.deepEqual(explainCalls, [
    {
      title: "春晓",
      author: "孟浩然",
      lines: ["春眠不觉晓。", "处处闻啼鸟。"],
      audience: "general",
    },
  ]);
  assert.deepEqual(updateCalls, [
    {
      where: {
        id: "ts300-0002",
      },
      data: {
        aiExplanation: {
          child_v1: {
            summary: "旧缓存",
            imagery: "旧缓存",
            emotion: "旧缓存",
            cachedAt: "2026-05-29T09:00:00.000Z",
          },
          general_v1: {
            summary: "这首诗从春天清晨醒来的听觉与感受入手。",
            imagery: "先写睡醒，再写鸟鸣和风雨后的花落。",
            emotion: "轻快里带着对春光流逝的体会。",
            cachedAt: "2026-05-29T12:00:00.000Z",
          },
        },
      },
    },
  ]);
});

test("handleExplainPoetry rejects unsupported audience values", async () => {
  const response = await handleExplainPoetry(
    new Request("http://localhost/api/ai/explain", {
      method: "POST",
      body: JSON.stringify({
        poetryId: "ts300-0003",
        audience: "teacher",
      }),
      headers: {
        "content-type": "application/json",
      },
    }),
    {
      repository: {
        poetry: {
          findUnique: async () => null,
          update: async () => ({}),
        },
      },
      explainPoetryImpl: async () => ({
        summary: "",
        imagery: "",
        emotion: "",
        cachedAt: "",
      }),
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Unsupported audience.",
  });
});
