import test from "node:test";
import assert from "node:assert/strict";

import { getHomeCtaLabel } from "@/components/home/today-poetry-hero";
import { getDailyPoetry } from "@/lib/poetry/daily";

test("getDailyPoetry returns scheduled poetry for a given date", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const result = await getDailyPoetry(
    "2026-05-29",
    {
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
      learningRecord: {
        findMany: async () => [],
      },
    },
    {
      getPoetryImage: async () => ({
        poetryId: "ts300-0001",
        imagePath: "/images/generated/ts300-0001.jpg",
        thumbPath: "/images/generated/ts300-0001-thumb.jpg",
        status: "ready",
        style: "storybook-watercolor",
        promptVersion: "v1",
        width: 1200,
        height: 675,
        isPlaceholder: false,
      }),
    },
    {
      now: new Date("2026-05-29T09:00:00.000Z"),
    },
  );

  process.env.SYSTEM_USER_ID = previousUserId;

  assert.deepEqual(result, {
    date: "2026-05-29",
    isReadToday: false,
    poetry: {
      id: "ts300-0001",
      title: "在岳咏蝉",
      author: "骆宾王",
      dynasty: "唐",
      lines: ["西陆蝉声唱，南冠客思侵。", "那堪玄鬓影，来对白头吟。"],
      imageKey: "ts300-0001",
      imageStatus: "placeholder",
      image: {
        poetryId: "ts300-0001",
        imagePath: "/images/generated/ts300-0001.jpg",
        thumbPath: "/images/generated/ts300-0001-thumb.jpg",
        status: "ready",
        style: "storybook-watercolor",
        promptVersion: "v1",
        width: 1200,
        height: 675,
        isPlaceholder: false,
      },
    },
  });
});

test("getDailyPoetry returns null when schedule is missing", async () => {
  const result = await getDailyPoetry(
    "2026-06-01",
    {
      dailyPoetry: {
        findUnique: async () => null,
      },
    },
    {
      getPoetryImage: async () => {
        throw new Error("should not query image when schedule is missing");
      },
    },
  );

  assert.equal(result, null);
});

test("getDailyPoetry requests poetry relation from repository", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";
  const calls: unknown[] = [];

  await getDailyPoetry(
    "2026-05-29",
    {
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
      learningRecord: {
        findMany: async () => [],
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
  );

  process.env.SYSTEM_USER_ID = previousUserId;

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

test("getDailyPoetry fetches homepage image from the ImageAsset runtime source", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";
  const calls: string[] = [];

  const result = await getDailyPoetry(
    "2026-05-29",
    {
      dailyPoetry: {
        findUnique: async () => ({
          date: "2026-05-29",
          poetry: {
            id: "ts300-0121",
            title: "登鹳雀楼",
            author: "王之涣",
            dynasty: "唐",
            lines: ["白日依山尽，黄河入海流。", "欲穷千里目，更上一层楼。"],
            imageKey: "legacy-key",
            imageStatus: "placeholder",
          },
        }),
      },
      learningRecord: {
        findMany: async () => [],
      },
    },
    {
      getPoetryImage: async (poetryId: string) => {
        calls.push(poetryId);
        return {
          poetryId,
          imagePath: "/images/generated/ts300-0121.jpg",
          thumbPath: "/images/generated/ts300-0121-thumb.jpg",
          status: "ready",
          style: "storybook-watercolor",
          promptVersion: "v1",
          width: 1440,
          height: 960,
          isPlaceholder: false,
        };
      },
    },
  );

  process.env.SYSTEM_USER_ID = previousUserId;

  assert.deepEqual(calls, ["ts300-0121"]);
  assert.equal(result?.poetry.image.imagePath, "/images/generated/ts300-0121.jpg");
});

test("getDailyPoetry keeps homepage usable by returning the placeholder image when no asset exists", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const result = await getDailyPoetry(
    "2026-05-30",
    {
      dailyPoetry: {
        findUnique: async () => ({
          date: "2026-05-30",
          poetry: {
            id: "ts300-0201",
            title: "静夜思",
            author: "李白",
            dynasty: "唐",
            lines: ["床前明月光，疑是地上霜。", "举头望明月，低头思故乡。"],
            imageKey: null,
            imageStatus: "ready",
          },
        }),
      },
      learningRecord: {
        findMany: async () => [],
      },
    },
    {
      getPoetryImage: async (poetryId: string) => ({
        poetryId,
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
  );

  process.env.SYSTEM_USER_ID = previousUserId;

  assert.deepEqual(result?.poetry.image, {
    poetryId: "ts300-0201",
    imagePath: "/images/placeholders/default-poetry-card.jpg",
    thumbPath: "/images/placeholders/default-poetry-card.jpg",
    status: "placeholder",
    style: "storybook-watercolor",
    promptVersion: "v1",
    width: null,
    height: null,
    isPlaceholder: true,
  });
});

test("getDailyPoetry marks poetry as read when a view_poetry record exists on the same UTC day", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const result = await getDailyPoetry(
    "2026-05-30",
    {
      dailyPoetry: {
        findUnique: async () => ({
          date: "2026-05-30",
          poetry: {
            id: "ts300-0201",
            title: "静夜思",
            author: "李白",
            dynasty: "唐",
            lines: ["床前明月光，疑是地上霜。", "举头望明月，低头思故乡。"],
            imageKey: null,
            imageStatus: "ready",
          },
        }),
      },
      learningRecord: {
        findMany: async () => [
          { createdAt: new Date("2026-05-30T01:15:00.000Z") },
          { createdAt: new Date("2026-05-29T12:00:00.000Z") },
        ],
      },
    },
    {
      getPoetryImage: async (poetryId: string) => ({
        poetryId,
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
      now: new Date("2026-05-30T23:59:59.000Z"),
    },
  );

  process.env.SYSTEM_USER_ID = previousUserId;

  assert.equal(result?.isReadToday, true);
});

test("getHomeCtaLabel returns full-reading label for unread poetry", () => {
  assert.equal(getHomeCtaLabel(false), "阅读全文");
});

test("getHomeCtaLabel returns challenge label for read poetry", () => {
  assert.equal(getHomeCtaLabel(true), "去挑战这首诗");
});
