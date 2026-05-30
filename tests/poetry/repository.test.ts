import test from "node:test";
import assert from "node:assert/strict";

import {
  getPoetryById,
  getRelatedPoetries,
  recordPoetryView,
} from "@/lib/poetry/repository";

test("getPoetryById returns normalized poetry detail fields", async () => {
  const result = await getPoetryById(
    "ts300-0001",
    {
      poetry: {
        findUnique: async () => ({
          id: "ts300-0001",
          title: "在岳咏蝉",
          author: "骆宾王",
          dynasty: "唐",
          lines: [
            "西陆蝉声唱，南冠客思侵。",
            "那堪玄鬓影，来对白头吟。",
          ],
          themes: ["咏物", "自况"],
          pinyin: ["xi lu chan sheng chang"],
          translation: "秋天里蝉声不断，囚徒的愁思也更浓。",
          imageKey: "ts300-0001",
          imageStatus: "placeholder",
        }),
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
        width: 1440,
        height: 960,
        isPlaceholder: false,
      }),
    },
  );

  assert.deepEqual(result, {
    id: "ts300-0001",
    title: "在岳咏蝉",
    author: "骆宾王",
    dynasty: "唐",
    lines: ["西陆蝉声唱，南冠客思侵。", "那堪玄鬓影，来对白头吟。"],
    themes: ["咏物", "自况"],
    pinyin: ["xi lu chan sheng chang"],
    translation: "秋天里蝉声不断，囚徒的愁思也更浓。",
    imageKey: "ts300-0001",
    imageStatus: "placeholder",
    image: {
      poetryId: "ts300-0001",
      imagePath: "/images/generated/ts300-0001.jpg",
      thumbPath: "/images/generated/ts300-0001-thumb.jpg",
      status: "ready",
      style: "storybook-watercolor",
      promptVersion: "v1",
      width: 1440,
      height: 960,
      isPlaceholder: false,
    },
  });
});

test("getPoetryById filters invalid json arrays into safe string lists", async () => {
  const result = await getPoetryById(
    "ts300-0002",
    {
      poetry: {
        findUnique: async () => ({
          id: "ts300-0002",
          title: "静夜思",
          author: "李白",
          dynasty: "唐",
          lines: ["床前明月光。", 2, null, "疑是地上霜。"],
          themes: "思乡",
          pinyin: ["chuang qian ming yue guang", { bad: true }],
          translation: null,
          imageKey: null,
          imageStatus: "ready",
        }),
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

  assert.deepEqual(result, {
    id: "ts300-0002",
    title: "静夜思",
    author: "李白",
    dynasty: "唐",
    lines: ["床前明月光。", "疑是地上霜。"],
    themes: [],
    pinyin: ["chuang qian ming yue guang"],
    translation: null,
    imageKey: null,
    imageStatus: "ready",
    image: {
      poetryId: "ts300-0002",
      imagePath: "/images/placeholders/default-poetry-card.jpg",
      thumbPath: "/images/placeholders/default-poetry-card.jpg",
      status: "placeholder",
      style: "storybook-watercolor",
      promptVersion: "v1",
      width: null,
      height: null,
      isPlaceholder: true,
    },
  });
});

test("getPoetryById returns null when poetry does not exist", async () => {
  const result = await getPoetryById(
    "missing-id",
    {
      poetry: {
        findUnique: async () => null,
      },
    },
    {
      getPoetryImage: async () => {
        throw new Error("should not query image when poetry is missing");
      },
    },
  );

  assert.equal(result, null);
});

test("getPoetryById requests the detail fields needed by the page", async () => {
  const calls: unknown[] = [];

  await getPoetryById(
    "ts300-0001",
    {
      poetry: {
        findUnique: async (args: unknown) => {
          calls.push(args);

          return {
            id: "ts300-0001",
            title: "在岳咏蝉",
            author: "骆宾王",
            dynasty: "唐",
            lines: [],
            themes: [],
            pinyin: null,
            translation: null,
            imageKey: "ts300-0001",
            imageStatus: "placeholder",
          };
        },
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

  assert.deepEqual(calls, [
    {
      where: { id: "ts300-0001" },
      select: {
        id: true,
        title: true,
        author: true,
        dynasty: true,
        lines: true,
        themes: true,
        pinyin: true,
        translation: true,
        imageKey: true,
        imageStatus: true,
      },
    },
  ]);
});

test("getPoetryById fetches runtime image data from ImageAsset by poetry id", async () => {
  const imageCalls: string[] = [];

  const result = await getPoetryById(
    "ts300-0121",
    {
      poetry: {
        findUnique: async () => ({
          id: "ts300-0121",
          title: "登鹳雀楼",
          author: "王之涣",
          dynasty: "唐",
          lines: ["白日依山尽，黄河入海流。", "欲穷千里目，更上一层楼。"],
          themes: ["登高"],
          pinyin: [],
          translation: null,
          imageKey: "legacy-key",
          imageStatus: "placeholder",
        }),
      },
    },
    {
      getPoetryImage: async (poetryId: string) => {
        imageCalls.push(poetryId);

        return {
          poetryId,
          imagePath: "/images/generated/ts300-0121.jpg",
          thumbPath: "/images/generated/ts300-0121-thumb.jpg",
          status: "ready",
          style: "storybook-watercolor",
          promptVersion: "v1",
          width: 1200,
          height: 675,
          isPlaceholder: false,
        };
      },
    },
  );

  assert.deepEqual(imageCalls, ["ts300-0121"]);
  assert.equal(result?.image.imagePath, "/images/generated/ts300-0121.jpg");
});

test("getRelatedPoetries returns author and theme based recommendations excluding current poetry", async () => {
  const result = await getRelatedPoetries(
    {
      id: "ts300-0001",
      author: "李白",
      themes: ["月夜", "思乡"],
    },
    {
      poetry: {
        findMany: async () => [
          {
            id: "ts300-0003",
            title: "月下独酌",
            author: "李白",
            dynasty: "唐",
            lines: ["花间一壶酒，独酌无相亲。"],
          },
          {
            id: "ts300-0004",
            title: "夜宿山寺",
            author: "李白",
            dynasty: "唐",
            lines: ["危楼高百尺，手可摘星辰。"],
          },
        ],
      },
    },
  );

  assert.deepEqual(result, [
    {
      id: "ts300-0003",
      title: "月下独酌",
      author: "李白",
      dynasty: "唐",
      previewLine: "花间一壶酒，独酌无相亲。",
    },
    {
      id: "ts300-0004",
      title: "夜宿山寺",
      author: "李白",
      dynasty: "唐",
      previewLine: "危楼高百尺，手可摘星辰。",
    },
  ]);
});

test("recordPoetryView writes a learning record with SYSTEM_USER_ID", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const calls: unknown[] = [];
  const syncCalls: unknown[] = [];

  await recordPoetryView("ts300-0001", {
    poetry: {
      findUnique: async () => null,
      findMany: async () => [],
    },
    learningRecord: {
      findMany: async () => [],
      create: async (args: unknown) => {
        calls.push(args);
        return {};
      },
    },
  }, {
    syncReviewState: async (args) => {
      syncCalls.push(args);
    },
  });

  assert.deepEqual(calls, [
    {
      data: {
        userId: "family-001",
        poetryId: "ts300-0001",
        eventType: "view_poetry",
      },
    },
  ]);
  assert.deepEqual(syncCalls, [
    {
      poetryId: "ts300-0001",
      eventType: "view_poetry",
    },
  ]);

  process.env.SYSTEM_USER_ID = previousUserId;
});

test("recordPoetryView is a no-op when SYSTEM_USER_ID is missing", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  delete process.env.SYSTEM_USER_ID;

  const calls: unknown[] = [];

  await recordPoetryView("ts300-0001", {
    poetry: {
      findUnique: async () => null,
      findMany: async () => [],
    },
    learningRecord: {
      findMany: async () => [],
      create: async (args: unknown) => {
        calls.push(args);
        return {};
      },
    },
  });

  assert.deepEqual(calls, []);

  process.env.SYSTEM_USER_ID = previousUserId;
});

test("recordPoetryView does not create a duplicate view record on the same UTC day", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const calls: unknown[] = [];

  await recordPoetryView("ts300-0001", {
    poetry: {
      findUnique: async () => null,
      findMany: async () => [],
    },
    learningRecord: {
      findMany: async (args: unknown) => {
        calls.push({ type: "findMany", args });

        return [{ createdAt: new Date("2026-05-30T00:00:01.000Z") }];
      },
      create: async (args: unknown) => {
        calls.push({ type: "create", args });
        return {};
      },
    },
  }, {
    now: new Date("2026-05-30T08:00:00.000Z"),
  });

  assert.deepEqual(calls, [
    {
      type: "findMany",
      args: {
        where: {
          userId: "family-001",
          poetryId: "ts300-0001",
          eventType: "view_poetry",
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  ]);

  process.env.SYSTEM_USER_ID = previousUserId;
});

test("recordPoetryView creates a view record when the latest one is from a previous UTC day", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const calls: unknown[] = [];
  const syncCalls: unknown[] = [];

  await recordPoetryView("ts300-0001", {
    poetry: {
      findUnique: async () => null,
      findMany: async () => [],
    },
    learningRecord: {
      findMany: async () => [{ createdAt: new Date("2026-05-29T23:59:59.000Z") }],
      create: async (args: unknown) => {
        calls.push(args);
        return {};
      },
    },
  }, {
    now: new Date("2026-05-30T08:00:00.000Z"),
    syncReviewState: async (args) => {
      syncCalls.push(args);
    },
  });

  assert.deepEqual(calls, [
    {
      data: {
        userId: "family-001",
        poetryId: "ts300-0001",
        eventType: "view_poetry",
      },
    },
  ]);
  assert.deepEqual(syncCalls, [
    {
      poetryId: "ts300-0001",
      eventType: "view_poetry",
    },
  ]);

  process.env.SYSTEM_USER_ID = previousUserId;
});
