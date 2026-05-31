import assert from "node:assert/strict";
import test from "node:test";

import {
  getScriptVariantLabel,
  pickPoetryContentVariant,
  resolveScriptVariant,
} from "@/lib/poetry/script-variant";

test("resolveScriptVariant defaults to zh-Hans", () => {
  assert.equal(resolveScriptVariant(undefined), "zh-Hans");
  assert.equal(resolveScriptVariant("unexpected"), "zh-Hans");
  assert.equal(resolveScriptVariant("zh-Hant"), "zh-Hant");
});

test("pickPoetryContentVariant returns simplified content by default", () => {
  const content = pickPoetryContentVariant(
    {
      title: "在狱咏蝉",
      titleOriginal: "在嶽詠蟬",
      titleZhHans: "在狱咏蝉",
      titleZhHant: "在嶽詠蟬",
      author: "骆宾王",
      authorOriginal: "駱賓王",
      authorZhHans: "骆宾王",
      authorZhHant: "駱賓王",
      lines: ["西陆蝉声唱，南冠客思侵。"],
      linesZhHans: ["西陆蝉声唱，南冠客思侵。"],
      linesZhHant: ["西陸蟬聲唱，南冠客思侵。"],
    },
    "zh-Hans",
  );

  assert.deepEqual(content, {
    title: "在狱咏蝉",
    author: "骆宾王",
    lines: ["西陆蝉声唱，南冠客思侵。"],
  });
});

test("pickPoetryContentVariant returns traditional content when requested", () => {
  const content = pickPoetryContentVariant(
    {
      title: "在狱咏蝉",
      titleOriginal: "在嶽詠蟬",
      titleZhHans: "在狱咏蝉",
      titleZhHant: "在嶽詠蟬",
      author: "骆宾王",
      authorOriginal: "駱賓王",
      authorZhHans: "骆宾王",
      authorZhHant: "駱賓王",
      lines: ["西陆蝉声唱，南冠客思侵。"],
      linesZhHans: ["西陆蝉声唱，南冠客思侵。"],
      linesZhHant: ["西陸蟬聲唱，南冠客思侵。"],
    },
    "zh-Hant",
  );

  assert.deepEqual(content, {
    title: "在嶽詠蟬",
    author: "駱賓王",
    lines: ["西陸蟬聲唱，南冠客思侵。"],
  });
});

test("getScriptVariantLabel returns UI labels", () => {
  assert.equal(getScriptVariantLabel("zh-Hans"), "简体");
  assert.equal(getScriptVariantLabel("zh-Hant"), "繁体");
});
