import assert from "node:assert/strict";
import test from "node:test";

import {
  extractCatalogEntries,
  extractDetailPayload,
  matchDetailToPoetry,
  parseTranslationAnnotation,
} from "@/lib/poetry/guwendao-annotation-import";

test("matchDetailToPoetry prefers sourceUid hash over stale poetry ids", () => {
  const detail = {
    ajaxId: "1",
    author: "李白",
    idStr: "abc123",
    idjm: "token",
    lines: ["云想衣裳花想容，春风拂槛露华浓。"],
    title: "清平调·其一",
  };

  const result = matchDetailToPoetry(detail, [
    {
      id: "ts300-9999",
      sourceUid: "abc123",
      title: "清平调 一",
      author: "李白",
      lines: ["云想衣裳花想容，春风拂槛露华浓。"],
    },
    {
      id: "ts300-0001",
      sourceUid: "zzz999",
      title: "清平调 一",
      author: "李白",
      lines: ["云想衣裳花想容，春风拂槛露华浓。"],
    },
  ]);

  assert.equal(result, "ts300-9999");
});

test("matchDetailToPoetry supports title aliases after renumbering", () => {
  const detail = {
    ajaxId: null,
    author: "王昌龄",
    idStr: "uid1",
    idjm: null,
    lines: ["奉帚平明金殿开，暂将团扇共裴回。", "玉颜不及寒鸦色，犹带昭阳日影来。"],
    title: "长信秋词五首·其三",
  };

  const result = matchDetailToPoetry(detail, [
    {
      id: "ts300-0310",
      sourceUid: "uid1x",
      title: "相和歌辞 长信怨 二",
      author: "王昌龄",
      lines: ["奉帚平明金殿开，暂将团扇共裴回。", "玉颜不及寒鸦色，犹带昭阳日影来。"],
    },
  ]);

  assert.equal(result, "ts300-0310");
});

test("extractCatalogEntries reads title and author from guwendao catalog blocks", () => {
  const html = `
    <div class="typecont">
      <span><a href="/shiwenv_aaa.aspx">静夜思</a>(李白)</span>
      <span><a href="/shiwenv_bbb.aspx">春晓</a>(孟浩然)</span>
    </div>
  `;

  assert.deepEqual(extractCatalogEntries(html), [
    { author: "李白", detailPath: "/shiwenv_aaa.aspx", title: "静夜思" },
    { author: "孟浩然", detailPath: "/shiwenv_bbb.aspx", title: "春晓" },
  ]);
});

test("extractDetailPayload reads hash and lines from poem detail html", () => {
  const html = `
    <div id="sonsyuanwen">
      <h1>静夜思</h1>
      <p class="source"><a>李白</a></p>
      <div class="contson">床前明月光。<br />疑是地上霜。</div>
    </div>
    <a href="javascript:fanyiShow(1,'JM','abc123')">展开阅读全文</a>
  `;

  assert.deepEqual(extractDetailPayload(html, "/shiwenv_abc123.aspx"), {
    ajaxId: "1",
    author: "李白",
    idStr: "abc123",
    idjm: "JM",
    lines: ["床前明月光。", "疑是地上霜。"],
    title: "静夜思",
  });
});

test("parseTranslationAnnotation splits translation and annotation text", () => {
  const html = `
    <div class="contyishang">
      <p><strong>译文</strong><br />第一句。<br />第二句。</p>
      <p><strong>注释</strong><br />注释一。<br />注释二。</p>
    </div>
  `;

  assert.deepEqual(parseTranslationAnnotation(html), {
    translation: "第一句。\n第二句。",
    annotation: "注释一。\n注释二。",
  });
});

test("parseTranslationAnnotation supports韵译直译散译 label blocks", () => {
  const html = `
    <div class="contyishang">
      <p>韵译</p>
      <p>第一段译文。</p>
      <p>直译</p>
      <p>第二段译文。</p>
      <p>注释</p>
      <p>注释一。</p>
    </div>
  `;

  assert.deepEqual(parseTranslationAnnotation(html), {
    translation: "第一段译文。\n第二段译文。",
    annotation: "注释一。",
  });
});
