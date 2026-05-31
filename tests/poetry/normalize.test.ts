import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDailyPoetrySeeds,
  formatSeedDate,
} from "@/lib/poetry/daily-seed";
import {
  normalizeTs300Poem,
  normalizeTs300Poems,
  type RawTs300Poem,
} from "@/lib/poetry/normalize";

const simplePoem: RawTs300Poem = {
  id: "c65539db-4e2b-4ce4-a22b-563b6ef3f4f1",
  title: "在狱咏蝉",
  author: "骆宾王",
  paragraphs: [
    "西陆蝉声唱，南冠客思侵。",
    "那堪玄鬓影，来对白头吟。",
    "露重飞难进，风多响易沉。",
    "无人信高洁，谁为表予心。",
  ],
  tags: ["唐诗三百首", "咏物", "咏物诗", "五言律诗"],
};

const rawPoem: RawTs300Poem = {
  id: "c65539db-4e2b-4ce4-a22b-563b6ef3f4f1",
  title: "在嶽詠蟬",
  author: "駱賓王",
  paragraphs: [
    "西陸蟬聲唱，南冠客思侵。",
    "那堪玄鬢影，來對白頭吟。",
    "露重飛難進，風多響易沈。",
    "無人信高潔，誰爲表予心。",
  ],
  tags: ["唐诗三百首", "咏物", "咏物诗", "五言律诗"],
};

test("normalizeTs300Poem keeps dual-script content and compatibility fields aligned", () => {
  const normalized = normalizeTs300Poem(simplePoem, rawPoem, 0);

  assert.equal(normalized.id, "ts300-0001");
  assert.equal(normalized.sourceId, 1);
  assert.equal(normalized.sourceUid, simplePoem.id);
  assert.equal(normalized.titleZhHans, "在狱咏蝉");
  assert.equal(normalized.titleZhHant, "在嶽詠蟬");
  assert.equal(normalized.authorZhHans, "骆宾王");
  assert.equal(normalized.authorZhHant, "駱賓王");
  assert.deepEqual(normalized.linesZhHans, [
    "西陆蝉声唱，南冠客思侵。",
    "那堪玄鬓影，来对白头吟。",
    "露重飞难进，风多响易沉。",
    "无人信高洁，谁为表予心。",
  ]);
  assert.deepEqual(normalized.linesZhHant, [
    "西陸蟬聲唱，南冠客思侵。",
    "那堪玄鬢影，來對白頭吟。",
    "露重飛難進，風多響易沈。",
    "無人信高潔，誰爲表予心。",
  ]);
  assert.equal(normalized.title, normalized.titleZhHans);
  assert.equal(normalized.titleOriginal, normalized.titleZhHant);
  assert.equal(normalized.author, normalized.authorZhHans);
  assert.equal(normalized.authorOriginal, normalized.authorZhHant);
  assert.deepEqual(normalized.lines, normalized.linesZhHans);
});

test("normalizeTs300Poem splits tags and themes with stable defaults", () => {
  const normalized = normalizeTs300Poem(simplePoem, rawPoem, 0);

  assert.deepEqual(normalized.tags, simplePoem.tags);
  assert.deepEqual(normalized.themes, ["咏物", "咏物诗", "五言律诗"]);
  assert.equal(normalized.difficulty, 2);
  assert.equal(normalized.imageKey, "ts300-0001");
  assert.equal(normalized.imageStatus, "placeholder");
});

test("normalizeTs300Poems assigns stable ids and preserves simplified authority text", () => {
  const normalized = normalizeTs300Poems(
    [simplePoem, { ...simplePoem, id: "another-id", title: "静夜思", author: "李白", paragraphs: ["床前明月光。", "疑是地上霜。", "举头望明月。", "低头思故乡。"] }],
    [rawPoem, { ...rawPoem, id: "another-id", title: "靜夜思", author: "李白", paragraphs: ["床前明月光。", "疑是地上霜。", "舉頭望明月。", "低頭思故鄉。"] }],
  );

  assert.equal(normalized[0].id, "ts300-0001");
  assert.equal(normalized[1].id, "ts300-0002");
  assert.equal(normalized[1].sourceId, 2);
  assert.equal(normalized[0].titleZhHans, "在狱咏蝉");
  assert.equal(normalized[0].title, "在狱咏蝉");
  assert.notEqual(normalized[0].title, "在岳咏蝉");
  assert.equal(normalized[1].titleZhHans, "静夜思");
  assert.equal(normalized[1].titleZhHant, "靜夜思");
});

test("buildDailyPoetrySeeds creates 365 future entries with deterministic cycling", () => {
  const seeds = buildDailyPoetrySeeds(
    ["ts300-0001", "ts300-0002", "ts300-0003"],
    new Date("2026-05-29T00:00:00.000Z"),
    5,
  );

  assert.equal(seeds.length, 5);
  assert.deepEqual(
    seeds.map((seed) => [seed.date, seed.poetryId]),
    [
      ["2026-05-29", "ts300-0001"],
      ["2026-05-30", "ts300-0002"],
      ["2026-05-31", "ts300-0003"],
      ["2026-06-01", "ts300-0001"],
      ["2026-06-02", "ts300-0002"],
    ],
  );
});

test("formatSeedDate formats UTC dates as YYYY-MM-DD", () => {
  assert.equal(
    formatSeedDate(new Date("2026-12-03T10:20:30.000Z")),
    "2026-12-03",
  );
});
