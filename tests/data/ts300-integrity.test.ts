import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTs300NormalizedPoems,
  buildTs300RawPoems,
  buildTs300SimplePoems,
  findMissingIds,
  findOrphanPoetryAudioFiles,
  findStaleExplainAudioFiles,
  findStaleIds,
  type Ts300ExportRecord,
} from "@/lib/data/ts300-integrity";

const record: Ts300ExportRecord = {
  id: "ts300-0002",
  sourceId: 2,
  sourceUid: "11111111-2222-3333-4444-555555555555",
  title: "登幽州台歌",
  titleOriginal: "登幽州臺歌",
  titleZhHans: "登幽州台歌",
  titleZhHant: "登幽州臺歌",
  author: "陈子昂",
  authorOriginal: "陳子昂",
  authorZhHans: "陈子昂",
  authorZhHant: "陳子昂",
  dynasty: "唐",
  lines: ["前不见古人，后不见来者。", "念天地之悠悠，独怆然而涕下。"],
  linesZhHans: ["前不见古人，后不见来者。", "念天地之悠悠，独怆然而涕下。"],
  linesZhHant: ["前不見古人，後不見來者。", "念天地之悠悠，獨愴然而涕下。"],
  tags: ["唐诗三百首", "古体诗"],
  themes: ["古体诗"],
  difficulty: 2,
  imageKey: "ts300-0002",
  imageStatus: "ready",
  translation: null,
  annotation: null,
  pinyin: ["qian bu jian gu ren", "hou bu jian lai zhe"],
  aiExplanation: null,
};

test("buildTs300SimplePoems exports simplified source payloads ordered by poetry id", () => {
  const result = buildTs300SimplePoems([
    { ...record, id: "ts300-0003", title: "春晓", titleZhHans: "春晓", sourceUid: "bbbbbbbb-2222-3333-4444-555555555555" },
    record,
  ]);

  assert.deepEqual(result[0], {
    author: "陈子昂",
    paragraphs: ["前不见古人，后不见来者。", "念天地之悠悠，独怆然而涕下。"],
    tags: ["唐诗三百首", "古体诗"],
    title: "登幽州台歌",
    id: "11111111-2222-3333-4444-555555555555",
  });
});

test("buildTs300RawPoems prefers original traditional fields", () => {
  const result = buildTs300RawPoems([record]);

  assert.deepEqual(result[0], {
    author: "陳子昂",
    paragraphs: ["前不見古人，後不見來者。", "念天地之悠悠，獨愴然而涕下。"],
    tags: ["唐诗三百首", "古体诗"],
    title: "登幽州臺歌",
    id: "11111111-2222-3333-4444-555555555555",
  });
});

test("buildTs300NormalizedPoems keeps normalized content fields", () => {
  const result = buildTs300NormalizedPoems([record]);

  assert.equal(result[0]?.id, "ts300-0002");
  assert.equal(result[0]?.sourceUid, "11111111-2222-3333-4444-555555555555");
  assert.deepEqual(result[0]?.linesZhHant, ["前不見古人，後不見來者。", "念天地之悠悠，獨愴然而涕下。"]);
  assert.deepEqual(result[0]?.themes, ["古体诗"]);
  assert.equal(result[0]?.imageStatus, "ready");
});

test("findStaleIds returns manifest ids no longer present in the canonical set", () => {
  assert.deepEqual(
    findStaleIds(["ts300-0001", "ts300-0002"], ["ts300-0002", "ts300-0003", "ts300-0003"]),
    ["ts300-0003"],
  );
});

test("findMissingIds returns canonical ids missing from the manifest", () => {
  assert.deepEqual(
    findMissingIds(["ts300-0001", "ts300-0002"], ["ts300-0002"]),
    ["ts300-0001"],
  );
});

test("findStaleExplainAudioFiles flags old poem ids and extra ids", () => {
  assert.deepEqual(
    findStaleExplainAudioFiles(
      [
        "ts300-0001_child.mp3",
        "ts300-0360_general.mp3",
        "ts300-extra-0001_child.mp3",
        "README.txt",
      ],
      ["ts300-0001", "ts300-0002"],
    ),
    ["ts300-0360_general.mp3", "ts300-extra-0001_child.mp3"],
  );
});

test("findOrphanPoetryAudioFiles keeps sourceUid-based files and flags unknown uuid files", () => {
  assert.deepEqual(
    findOrphanPoetryAudioFiles(
      [
        "11111111-2222-3333-4444-555555555555.mp3",
        "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.mp3",
        "ts300-0001.mp3",
      ],
      ["11111111-2222-3333-4444-555555555555"],
    ),
    ["aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.mp3"],
  );
});
