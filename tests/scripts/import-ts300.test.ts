import test from "node:test";
import assert from "node:assert/strict";

import {
  buildImportPayload,
  summarizeImportResult,
  validateTs300PoemPairing,
  type ImportResult,
} from "@/scripts/import-ts300";
import type { RawTs300Poem } from "@/lib/poetry/normalize";

const simplePoems: RawTs300Poem[] = [
  {
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
  },
  {
    id: "c244a5b4-0ed0-48fe-8694-95309acac184",
    title: "登幽州台歌",
    author: "陈子昂",
    paragraphs: ["前不见古人，后不见来者。", "念天地之悠悠，独怆然而涕下。"],
    tags: ["唐诗三百首", "伤怀", "七言古诗"],
  },
];

const rawPoems: RawTs300Poem[] = [
  {
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
  },
  {
    id: "c244a5b4-0ed0-48fe-8694-95309acac184",
    title: "登幽州臺歌",
    author: "陳子昂",
    paragraphs: ["前不見古人，後不見來者。", "念天地之悠悠，獨愴然而涕下。"],
    tags: ["唐诗三百首", "伤怀", "七言古诗"],
  },
];

test("buildImportPayload succeeds when dual sources align and preserves simplified first title", () => {
  const payload = buildImportPayload(simplePoems, rawPoems, new Date("2026-05-31T00:00:00.000Z"), 5);

  assert.equal(payload.poetries.length, 2);
  assert.equal(payload.dailySeeds.length, 5);
  assert.equal(payload.poetries[0]?.titleZhHans, "在狱咏蝉");
  assert.equal(payload.poetries[0]?.title, "在狱咏蝉");
  assert.notEqual(payload.poetries[0]?.title, "在岳咏蝉");
});

test("validateTs300PoemPairing fails when dual source lengths differ", () => {
  assert.throws(
    () => validateTs300PoemPairing(simplePoems, rawPoems.slice(0, 1)),
    /ts300 source length mismatch/i,
  );
});

test("validateTs300PoemPairing fails when same index UUID differs", () => {
  assert.throws(
    () =>
      validateTs300PoemPairing(simplePoems, [
        rawPoems[0]!,
        {
          ...rawPoems[1]!,
          id: "mismatched-id",
        },
      ]),
    /uuid mismatch/i,
  );
});

test("validateTs300PoemPairing fails when required fields are missing", () => {
  assert.throws(
    () =>
      validateTs300PoemPairing(
        [
          {
            ...simplePoems[0]!,
            title: "",
          },
        ],
        [rawPoems[0]!],
      ),
    /simple poem at index 0 has invalid title/i,
  );

  assert.throws(
    () =>
      validateTs300PoemPairing(
        [simplePoems[0]!],
        [
          {
            ...rawPoems[0]!,
            paragraphs: [] as unknown as string[],
          },
        ],
      ),
    /raw poem at index 0 has invalid paragraphs/i,
  );
});

test("summarizeImportResult reports aligned source and output counts", () => {
  const result: ImportResult = {
    simpleCount: 2,
    rawCount: 2,
    poetries: buildImportPayload(simplePoems, rawPoems, new Date("2026-05-31T00:00:00.000Z"), 2)
      .poetries,
    dailySeeds: buildImportPayload(simplePoems, rawPoems, new Date("2026-05-31T00:00:00.000Z"), 2)
      .dailySeeds,
  };

  assert.deepEqual(summarizeImportResult(result), {
    simpleCount: 2,
    rawCount: 2,
    normalizedCount: 2,
    dailySeedCount: 2,
  });
});
