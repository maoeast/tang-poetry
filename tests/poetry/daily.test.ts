import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHomePoetryPreviewLines,
  getHomeCtaHref,
  getHomeCtaLabel,
} from "@/components/home/today-poetry-hero";
import { getDailyPoetry } from "@/lib/poetry/daily";

test("buildHomePoetryPreviewLines splits coupled lines into single-sentence rows", () => {
  assert.deepEqual(buildHomePoetryPreviewLines([
    "君不见黄河之水天上来，奔流到海不复回。",
    "君不见高堂明镜悲白发，朝如青丝暮成雪。",
  ]), [
    "君不见黄河之水天上来，",
    "奔流到海不复回。",
    "君不见高堂明镜悲白发，",
    "朝如青丝暮成雪。",
  ]);
});

test("buildHomePoetryPreviewLines tolerates source lines without punctuation", () => {
  assert.deepEqual(buildHomePoetryPreviewLines([
    "山中相送罢",
    "日暮掩柴扉",
  ]), [
    "山中相送罢",
    "日暮掩柴扉",
  ]);
});

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
            title: "在狱咏蝉",
            titleOriginal: "在嶽詠蟬",
            titleZhHans: "在狱咏蝉",
            titleZhHant: "在嶽詠蟬",
            author: "骆宾王",
            authorOriginal: "駱賓王",
            authorZhHans: "骆宾王",
            authorZhHant: "駱賓王",
            dynasty: "唐",
            lines: [
              "西陆蝉声唱，南冠客思侵。",
              "那堪玄鬓影，来对白头吟。",
            ],
            linesZhHans: [
              "西陆蝉声唱，南冠客思侵。",
              "那堪玄鬓影，来对白头吟。",
            ],
            linesZhHant: [
              "西陸蟬聲唱，南冠客思侵。",
              "那堪玄鬢影，來對白頭吟。",
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
      scriptVariant: "zh-Hans",
    },
  );

  process.env.SYSTEM_USER_ID = previousUserId;

  assert.equal(result?.date, "2026-05-29");
  assert.equal(result?.isReadToday, false);
  assert.equal(result?.poetry.id, "ts300-0001");
  assert.equal(result?.poetry.title, "在狱咏蝉");
  assert.equal(result?.poetry.author, "骆宾王");
  assert.deepEqual(result?.poetry.lines, [
    "西陆蝉声唱，南冠客思侵。",
    "那堪玄鬓影，来对白头吟。",
  ]);
  assert.equal(result?.poetry.image.imagePath, "/images/generated/ts300-0001.jpg");
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
              title: "在狱咏蝉",
              titleOriginal: "在嶽詠蟬",
              titleZhHans: "在狱咏蝉",
              titleZhHant: "在嶽詠蟬",
              author: "骆宾王",
              authorOriginal: "駱賓王",
              authorZhHans: "骆宾王",
              authorZhHant: "駱賓王",
              dynasty: "唐",
              lines: [],
              linesZhHans: [],
              linesZhHant: [],
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
            titleOriginal: true,
            titleZhHans: true,
            titleZhHant: true,
            author: true,
            authorOriginal: true,
            authorZhHans: true,
            authorZhHant: true,
            dynasty: true,
            lines: true,
            linesZhHans: true,
            linesZhHant: true,
            imageKey: true,
            imageStatus: true,
          },
        },
      },
    },
  ]);
});

test("getDailyPoetry returns traditional content when scriptVariant is zh-Hant", async () => {
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
      scriptVariant: "zh-Hant",
    },
  );

  assert.equal(result?.poetry.title, "在嶽詠蟬");
  assert.equal(result?.poetry.author, "駱賓王");
  assert.deepEqual(result?.poetry.lines, ["西陸蟬聲唱，南冠客思侵。"]);
});

test("getHomeCtaHref points unread items to the poem detail page", () => {
  assert.equal(getHomeCtaHref("ts300-0001", false), "/poetry/ts300-0001");
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
            titleOriginal: "登鸛雀樓",
            titleZhHans: "登鹳雀楼",
            titleZhHant: "登鸛雀樓",
            author: "王之涣",
            authorOriginal: "王之渙",
            authorZhHans: "王之涣",
            authorZhHant: "王之渙",
            dynasty: "唐",
            lines: ["白日依山尽，黄河入海流。", "欲穷千里目，更上一层楼。"],
            linesZhHans: ["白日依山尽，黄河入海流。", "欲穷千里目，更上一层楼。"],
            linesZhHant: ["白日依山盡，黃河入海流。", "欲窮千里目，更上一層樓。"],
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
            titleOriginal: "靜夜思",
            titleZhHans: "静夜思",
            titleZhHant: "靜夜思",
            author: "李白",
            authorOriginal: "李白",
            authorZhHans: "李白",
            authorZhHant: "李白",
            dynasty: "唐",
            lines: ["床前明月光，疑是地上霜。", "举头望明月，低头思故乡。"],
            linesZhHans: ["床前明月光，疑是地上霜。", "举头望明月，低头思故乡。"],
            linesZhHant: ["床前明月光，疑是地上霜。", "舉頭望明月，低頭思故鄉。"],
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
            titleOriginal: "靜夜思",
            titleZhHans: "静夜思",
            titleZhHant: "靜夜思",
            author: "李白",
            authorOriginal: "李白",
            authorZhHans: "李白",
            authorZhHant: "李白",
            dynasty: "唐",
            lines: ["床前明月光，疑是地上霜。", "举头望明月，低头思故乡。"],
            linesZhHans: ["床前明月光，疑是地上霜。", "举头望明月，低头思故乡。"],
            linesZhHant: ["床前明月光，疑是地上霜。", "舉頭望明月，低頭思故鄉。"],
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
  assert.equal(getHomeCtaLabel(true), "去闯关这首诗");
});
