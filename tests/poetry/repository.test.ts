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
          sourceUid: "c65539db-4e2b-4ce4-a22b-563b6ef3f4f1",
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
          themes: ["咏物", "自况"],
          pinyin: ["xi lu chan sheng chang"],
          translation: "秋天里蝉声不断，囚徒的愁思也更浓。",
          imageKey: "ts300-0001",
          imageStatus: "placeholder",
          audioMeta: null,
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
      hasAudioFile: () => true,
    },
  );

  assert.deepEqual(result, {
    id: "ts300-0001",
    title: "在狱咏蝉",
    author: "骆宾王",
    dynasty: "唐",
    lines: ["西陆蝉声唱，南冠客思侵。", "那堪玄鬓影，来对白头吟。"],
    themes: ["咏物", "自况"],
    pinyin: ["xi lu chan sheng chang"],
    translation: "秋天里蝉声不断，囚徒的愁思也更浓。",
    imageKey: "ts300-0001",
    imageStatus: "placeholder",
    authorAvatarUrl: "/images/authors/luobinwang.jpg",
    audio: {
      audioStatus: "ready",
      url: "/audio/poetry/c65539db-4e2b-4ce4-a22b-563b6ef3f4f1.mp3",
      durationMs: 0,
    },
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

test("getPoetryById returns traditional content when scriptVariant is zh-Hant", async () => {
  const result = await getPoetryById(
    "ts300-0001",
    {
      poetry: {
        findUnique: async () => ({
          id: "ts300-0001",
          sourceUid: "c65539db-4e2b-4ce4-a22b-563b6ef3f4f1",
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
          themes: ["咏物"],
          pinyin: [],
          translation: null,
          imageKey: "ts300-0001",
          imageStatus: "placeholder",
          audioMeta: null,
        }),
      },
    } as never,
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
      hasAudioFile: () => true,
    },
    "zh-Hant",
  );

  assert.equal(result?.title, "在嶽詠蟬");
  assert.equal(result?.author, "駱賓王");
  assert.deepEqual(result?.lines, ["西陸蟬聲唱，南冠客思侵。"]);
});

test("getPoetryById filters invalid json arrays into safe string lists", async () => {
  const result = await getPoetryById(
    "ts300-0002",
    {
      poetry: {
        findUnique: async () => ({
          id: "ts300-0002",
          sourceUid: "75db753d-e7da-48a1-a6c0-6ed9147e58db",
          title: "静夜思",
          titleOriginal: "靜夜思",
          titleZhHans: "静夜思",
          titleZhHant: "靜夜思",
          author: "李白",
          authorOriginal: "李白",
          authorZhHans: "李白",
          authorZhHant: "李白",
          dynasty: "唐",
          lines: ["床前明月光。", 2, null, "疑是地上霜。"],
          linesZhHans: ["床前明月光。", 2, null, "疑是地上霜。"],
          linesZhHant: ["床前明月光。", "疑是地上霜。"],
          themes: "思乡",
          pinyin: ["chuang qian ming yue guang", { bad: true }],
          translation: null,
          imageKey: null,
          imageStatus: "ready",
          audioMeta: null,
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
      hasAudioFile: () => false,
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
    authorAvatarUrl: "/images/authors/libai.jpg",
    audio: {
      audioStatus: "none",
      url: null,
      durationMs: 0,
    },
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

test("getPoetryById returns aggregated audio metadata for the immersive detail page", async () => {
  const result = await getPoetryById(
    "ts300-0003",
    {
      poetry: {
        findUnique: async () => ({
          id: "ts300-0003",
          sourceUid: "8f8e2130-36ea-4334-9ae6-ec17edac4703",
          title: "春晓",
          author: "孟浩然",
          dynasty: "唐",
          lines: ["春眠不觉晓。", "处处闻啼鸟。"],
          themes: ["春景"],
          pinyin: ["chun mian bu jue xiao", "chu chu wen ti niao"],
          translation: "春夜睡得香甜，不知不觉天已亮了。",
          imageKey: "ts300-0003",
          imageStatus: "ready",
          audioMeta: {
            status: "ready",
            durationMs: 18_000,
            lineTimings: [
              {
                lineIndex: 0,
                startMs: 0,
              },
              {
                lineIndex: 1,
                startMs: 9_000,
              },
            ],
          },
        }),
      },
    } as never,
    {
      getPoetryImage: async (poetryId: string) => ({
        poetryId,
        imagePath: "/images/generated/ts300-0003.jpg",
        thumbPath: "/images/generated/ts300-0003-thumb.jpg",
        status: "ready",
        style: "storybook-watercolor",
        promptVersion: "v1",
        width: 1200,
        height: 1800,
        isPlaceholder: false,
      }),
      hasAudioFile: () => true,
    },
  );

  assert.deepEqual(result?.audio, {
    audioStatus: "ready",
    url: "/audio/poetry/8f8e2130-36ea-4334-9ae6-ec17edac4703.mp3",
    durationMs: 18_000,
    lineTimings: [
      { lineIndex: 0, startMs: 0 },
      { lineIndex: 1, startMs: 9_000 },
    ],
  });
});

test("getPoetryById falls back to none when audio metadata status is unsupported", async () => {
  const result = await getPoetryById(
    "ts300-0004",
    {
      poetry: {
        findUnique: async () => ({
          id: "ts300-0004",
          sourceUid: "1a45fc32-351c-469c-9c31-b279ef20ee8a",
          title: "鹿柴",
          author: "王维",
          dynasty: "唐",
          lines: ["空山不见人。", "但闻人语响。"],
          themes: ["山水"],
          pinyin: [],
          translation: null,
          imageKey: "ts300-0004",
          imageStatus: "ready",
          audioMeta: {
            status: "processing",
            durationMs: 15_000,
            lineTimings: [
              {
                lineIndex: 0,
                startMs: 0,
              },
            ],
          },
        }),
      },
    } as never,
    {
      getPoetryImage: async (poetryId: string) => ({
        poetryId,
        imagePath: "/images/generated/ts300-0004.jpg",
        thumbPath: "/images/generated/ts300-0004-thumb.jpg",
        status: "ready",
        style: "storybook-watercolor",
        promptVersion: "v1",
        width: 1200,
        height: 1800,
        isPlaceholder: false,
      }),
      hasAudioFile: () => false,
    },
  );

  assert.deepEqual(result?.audio, {
    audioStatus: "none",
    url: null,
    durationMs: 0,
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
      hasAudioFile: () => false,
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
            sourceUid: "c65539db-4e2b-4ce4-a22b-563b6ef3f4f1",
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
            themes: [],
            pinyin: null,
            translation: null,
            imageKey: "ts300-0001",
            imageStatus: "placeholder",
            audioMeta: null,
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
      hasAudioFile: () => false,
    },
  );

  assert.deepEqual(calls, [
    {
      where: { id: "ts300-0001" },
      select: {
        id: true,
        sourceUid: true,
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
        themes: true,
        pinyin: true,
        translation: true,
        imageKey: true,
        imageStatus: true,
        audioMeta: true,
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
          sourceUid: "e77ecf12-0c3f-4484-8c49-fca0a1d8309b",
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
          themes: ["登高"],
          pinyin: [],
          translation: null,
          imageKey: "legacy-key",
          imageStatus: "placeholder",
          audioMeta: null,
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
      hasAudioFile: () => false,
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
  const now = new Date("2026-05-30T08:00:00.000Z");

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
    now,
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
        dayKey: "2026-4-30",
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
  const now = new Date("2026-05-30T08:00:00.000Z");

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
    now,
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
        dayKey: "2026-4-30",
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

test("recordPoetryView skips sync when create hits the same-day unique constraint", async () => {
  const previousUserId = process.env.SYSTEM_USER_ID;
  process.env.SYSTEM_USER_ID = "family-001";

  const syncCalls: unknown[] = [];

  await recordPoetryView("ts300-0001", {
    poetry: {
      findUnique: async () => null,
      findMany: async () => [],
    },
    learningRecord: {
      findMany: async () => [],
      create: async () => {
        const error = new Error("unique constraint");
        Object.assign(error, { code: "P2002" });
        throw error;
      },
    },
  }, {
    now: new Date("2026-05-30T08:00:00.000Z"),
    syncReviewState: async (args) => {
      syncCalls.push(args);
    },
  });

  assert.deepEqual(syncCalls, []);

  process.env.SYSTEM_USER_ID = previousUserId;
});
