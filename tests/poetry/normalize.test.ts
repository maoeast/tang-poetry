import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDailyPoetrySeeds,
  buildInterleavedDailySeeds,
  formatSeedDate,
} from "@/lib/poetry/daily-seed";
import {
  normalizePoem,
  normalizeSingleSourcePoems,
  normalizeTs300Poem,
  normalizeTs300Poems,
  type RawPoem,
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

test("normalizePoem with opencc callback generates traditional text", () => {
  const poem: RawPoem = {
    id: "test-id",
    title: "静夜思",
    author: "李白",
    paragraphs: ["床前明月光。", "疑是地上霜。"],
    tags: ["宋词精选", "词", "小令"],
  };

  // Simple mock converter that adds a marker
  const mockConvert = (t: string) => t + "_trad";

  const normalized = normalizePoem(poem, null, 0, {
    idPrefix: "sc200",
    dynasty: "宋",
    convertToTraditional: mockConvert,
  });

  assert.equal(normalized.id, "sc200-0001");
  assert.equal(normalized.dynasty, "宋");
  assert.equal(normalized.titleZhHans, "静夜思");
  assert.equal(normalized.titleZhHant, "静夜思_trad");
  assert.equal(normalized.authorZhHant, "李白_trad");
  assert.deepEqual(normalized.linesZhHant, [
    "床前明月光。_trad",
    "疑是地上霜。_trad",
  ]);
  // Only "宋词精选" is filtered from themes (source tag), "词" and "小令" remain
  assert.deepEqual(normalized.themes, ["词", "小令"]);
  assert.equal(normalized.difficulty, 3); // "词" matches value 3 (checked before "小令" value 2)
});

test("normalizeSingleSourcePoems with dynastyMap", () => {
  const poems: RawPoem[] = [
    { id: "a", title: "关雎", author: "诗经", paragraphs: ["关关雎鸠。"], tags: ["古诗三百"] },
    { id: "b", title: "观沧海", author: "曹操", paragraphs: ["东临碣石。"], tags: ["古诗三百"] },
  ];

  const noOpConvert = (t: string) => t;
  const normalized = normalizeSingleSourcePoems(poems, {
    idPrefix: "gs300",
    dynastyMap: (_poem, index) => (index < 1 ? "先秦" : "魏晋"),
    convertToTraditional: noOpConvert,
  });

  assert.equal(normalized[0].id, "gs300-0001");
  assert.equal(normalized[0].dynasty, "先秦");
  assert.equal(normalized[1].id, "gs300-0002");
  assert.equal(normalized[1].dynasty, "魏晋");
});

test("buildInterleavedDailySeeds rotates sources round-robin", () => {
  const seeds = buildInterleavedDailySeeds(
    [
      { source: "ts300", poetryIds: ["ts-1", "ts-2"] },
      { source: "gs300", poetryIds: ["gs-1"] },
      { source: "sc200", poetryIds: ["sc-1", "sc-2", "sc-3"] },
    ],
    new Date("2026-06-01T00:00:00.000Z"),
    6,
  );

  assert.equal(seeds.length, 6);
  // Day 0=ts, Day 1=gs, Day 2=sc, Day 3=ts, Day 4=gs(cycle), Day 5=sc
  assert.equal(seeds[0].poetryId, "ts-1");
  assert.equal(seeds[1].poetryId, "gs-1");
  assert.equal(seeds[2].poetryId, "sc-1");
  assert.equal(seeds[3].poetryId, "ts-2");
  assert.equal(seeds[4].poetryId, "gs-1"); // gs cycles back
  assert.equal(seeds[5].poetryId, "sc-2");
});
