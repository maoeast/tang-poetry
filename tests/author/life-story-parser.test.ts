import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  stripTrailingJunk,
  detectFormat,
  parseInlineFormat,
  parseNewlineFormat,
  parseLifeStory,
} from "@/lib/author/life-story-parser";

// ── stripTrailingJunk ──────────────────────────────────────

describe("stripTrailingJunk", () => {
  it("strips ▲\\n\\n参考资料：完善", () => {
    const text = "正文内容。▲\n\n参考资料：完善";
    assert.equal(stripTrailingJunk(text), "正文内容。");
  });

  it("strips trailing ▲ only", () => {
    const text = "正文内容。▲";
    assert.equal(stripTrailingJunk(text), "正文内容。");
  });

  it("strips 参考资料：完善 without ▲", () => {
    const text = "正文内容。\n\n参考资料：完善";
    assert.equal(stripTrailingJunk(text), "正文内容。");
  });

  it("leaves clean text unchanged", () => {
    const text = "正文内容。";
    assert.equal(stripTrailingJunk(text), text);
  });

  it("handles trailing whitespace after junk", () => {
    const text = "正文内容。▲\n\n参考资料：完善  ";
    assert.equal(stripTrailingJunk(text), "正文内容。");
  });
});

// ── detectFormat ────────────────────────────────────────────

describe("detectFormat", () => {
  it("detects inline format (\\u3000\\u3000 present)", () => {
    const text = "少年时期\u3000\u3000陈子昂幼而聪颖...\n\n两次落第\u3000\u3000高宗调露元年...";
    assert.equal(detectFormat(text), "inline");
  });

  it("detects newline format (short heading lines)", () => {
    const text = "早年天才\n\n长安元年（701年），李白...\n\n辞亲远游\n\n开元十二年...";
    assert.equal(detectFormat(text), "newline");
  });

  it("detects plain format (no structure)", () => {
    const text = "王建，字仲初，颍川人。大历十年进士。...";
    assert.equal(detectFormat(text), "plain");
  });

  it("detects plain for very short text", () => {
    assert.equal(detectFormat("短短的介绍文字。"), "plain");
  });
});

// ── parseInlineFormat ───────────────────────────────────────

describe("parseInlineFormat", () => {
  it("parses 陈子昂 (4 chapters, inline)", () => {
    const text =
      "少年时期\u3000\u3000陈子昂幼而聪颖，少而任侠。\n\n两次落第\u3000\u3000高宗调露元年（679年），怀经纬之才。\n\n得到重用\u3000\u3000文明元年（684）进士及第。\n\n受谗被诬\u3000\u3000陈子昂北征，多次直言进谏。";
    const chapters = parseInlineFormat(text);

    assert.equal(chapters.length, 4);
    assert.equal(chapters[0].heading, "少年时期");
    assert.ok(chapters[0].content.includes("陈子昂幼而聪颖"));
    assert.equal(chapters[1].heading, "两次落第");
    assert.equal(chapters[2].heading, "得到重用");
    assert.equal(chapters[3].heading, "受谗被诬");
  });

  it("handles multi-paragraph content within a chapter (骆宾王)", () => {
    const text =
      "基本介绍\u3000\u3000骆宾王（约638—684），唐代著名诗人。\n\n骆宾王出身寒门，七岁能诗。\n\n他还曾久戍边城。\n\n生平事迹\u3000\u3000骆宾王之父官青州博昌县令。";
    const chapters = parseInlineFormat(text);

    assert.equal(chapters.length, 2);
    assert.equal(chapters[0].heading, "基本介绍");
    assert.ok(chapters[0].content.includes("骆宾王（约638"));
    assert.ok(chapters[0].content.includes("七岁能诗"));
    assert.ok(chapters[0].content.includes("久戍边城"));
    assert.equal(chapters[1].heading, "生平事迹");
  });

  it("returns empty for text without headings", () => {
    const text = "纯文本内容，没有章节标题。";
    const chapters = parseInlineFormat(text);
    assert.equal(chapters.length, 0);
  });
});

// ── parseNewlineFormat ──────────────────────────────────────

describe("parseNewlineFormat", () => {
  it("parses 李白 style (headings on own lines)", () => {
    const text =
      "早年天才\n\n长安元年（701年），李白字太白。\n\n辞亲远游\n\n开元十二年，李白出蜀。";
    const chapters = parseNewlineFormat(text);

    assert.equal(chapters.length, 2);
    assert.equal(chapters[0].heading, "早年天才");
    assert.ok(chapters[0].content.includes("长安元年"));
    assert.equal(chapters[1].heading, "辞亲远游");
    assert.ok(chapters[1].content.includes("开元十二年"));
  });

  it("handles multi-paragraph content within a chapter", () => {
    const text =
      "早年天才\n\n李白五岁发蒙读书。\n\n开元三年，李白十五岁。\n\n辞亲远游\n\n开元十二年出蜀。";
    const chapters = parseNewlineFormat(text);

    assert.equal(chapters.length, 2);
    assert.equal(chapters[0].heading, "早年天才");
    assert.ok(chapters[0].content.includes("发蒙读书"));
    assert.ok(chapters[0].content.includes("十五岁"));
    assert.equal(chapters[1].heading, "辞亲远游");
  });

  it("does not treat 参考资料 as a heading", () => {
    const text = "早年天才\n\n李白内容。\n\n参考资料：完善";
    const chapters = parseNewlineFormat(text);
    assert.equal(chapters.length, 1);
    assert.equal(chapters[0].heading, "早年天才");
  });
});

// ── parseLifeStory (integration) ────────────────────────────

describe("parseLifeStory", () => {
  it("returns plain for text without structure", () => {
    const result = parseLifeStory("王建，字仲初，颍川人。▲\n\n参考资料：完善");
    assert.equal(result.format, "plain");
    assert.equal(result.chapters.length, 0);
    assert.equal(result.cleanText, "王建，字仲初，颍川人。");
  });

  it("returns inline for \\u3000\\u3000 text", () => {
    const raw = "少年时期\u3000\u3000陈子昂聪颖。▲\n\n参考资料：完善";
    const result = parseLifeStory(raw);
    assert.equal(result.format, "inline");
    assert.equal(result.chapters.length, 1);
    assert.equal(result.chapters[0].heading, "少年时期");
  });

  it("returns newline for standalone heading text", () => {
    const raw = "早年天才\n\n李白内容。\n\n辞亲远游\n\n出蜀内容。▲";
    const result = parseLifeStory(raw);
    assert.equal(result.format, "newline");
    assert.equal(result.chapters.length, 2);
  });

  it("handles empty string", () => {
    const result = parseLifeStory("");
    assert.equal(result.format, "plain");
    assert.equal(result.cleanText, "");
    assert.equal(result.chapters.length, 0);
  });

  it("handles very short text", () => {
    const result = parseLifeStory("简短介绍。");
    assert.equal(result.format, "plain");
    assert.equal(result.cleanText, "简短介绍。");
  });
});
