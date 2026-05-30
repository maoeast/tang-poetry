import test from "node:test";
import assert from "node:assert/strict";

import { getDailyPoetry } from "@/lib/poetry/daily";

test("getDailyPoetry returns scheduled poetry for a given date", async () => {
  const result = await getDailyPoetry("2026-05-29", {
    dailyPoetry: {
      findUnique: async () => ({
        date: "2026-05-29",
        poetry: {
          id: "ts300-0001",
          title: "在岳咏蝉",
          author: "骆宾王",
          dynasty: "唐",
          lines: [
            "西陆蝉声唱，南冠客思侵。",
            "那堪玄鬓影，来对白头吟。",
          ],
          imageKey: "ts300-0001",
          imageStatus: "placeholder",
        },
      }),
    },
  });

  assert.deepEqual(result, {
    date: "2026-05-29",
    poetry: {
      id: "ts300-0001",
      title: "在岳咏蝉",
      author: "骆宾王",
      dynasty: "唐",
      lines: ["西陆蝉声唱，南冠客思侵。", "那堪玄鬓影，来对白头吟。"],
      imageKey: "ts300-0001",
      imageStatus: "placeholder",
    },
  });
});

test("getDailyPoetry returns null when schedule is missing", async () => {
  const result = await getDailyPoetry("2026-06-01", {
    dailyPoetry: {
      findUnique: async () => null,
    },
  });

  assert.equal(result, null);
});

test("getDailyPoetry requests poetry relation from repository", async () => {
  const calls: unknown[] = [];

  await getDailyPoetry("2026-05-29", {
    dailyPoetry: {
      findUnique: async (args: unknown) => {
        calls.push(args);

        return {
          date: "2026-05-29",
          poetry: {
            id: "ts300-0001",
            title: "在岳咏蝉",
            author: "骆宾王",
            dynasty: "唐",
            lines: [],
            imageKey: "ts300-0001",
            imageStatus: "placeholder",
          },
        };
      },
    },
  });

  assert.deepEqual(calls, [
    {
      where: { date: "2026-05-29" },
      select: {
        date: true,
        poetry: {
          select: {
            id: true,
            title: true,
            author: true,
            dynasty: true,
            lines: true,
            imageKey: true,
            imageStatus: true,
          },
        },
      },
    },
  ]);
});
