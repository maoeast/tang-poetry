import test from "node:test";
import assert from "node:assert/strict";

import {
  extractCatalogEntries,
  extractDetailPayload,
  findNormalizedFallbackPoetry,
  matchDetailToPoetry,
  parseTranslationAnnotation,
} from "@/lib/poetry/guwendao-annotation-import";

test("extractCatalogEntries reads poem links from the Tang 300 catalog page", () => {
  const html = `
    <div class="typecont">
      <span><a href="/shiwenv_c35a60c1a8e2.aspx" target="_blank">静夜思</a>(李白)</span>
      <span><a href="/shiwenv_ccee5691ba93.aspx" target="_blank">春晓</a>(孟浩然)</span>
    </div>
  `;

  assert.deepEqual(extractCatalogEntries(html), [
    {
      author: "李白",
      detailPath: "/shiwenv_c35a60c1a8e2.aspx",
      title: "静夜思",
    },
    {
      author: "孟浩然",
      detailPath: "/shiwenv_ccee5691ba93.aspx",
      title: "春晓",
    },
  ]);
});

test("extractDetailPayload reads title, author, lines, and ajax params from a detail page", () => {
  const html = `
    <div class="sons" id="sonsyuanwen">
      <div class="cont">
        <div id="zhengwenc35a60c1a8e2">
          <h1>静夜思</h1>
          <p class="source"><a>李白</a><a>〔唐代〕</a></p>
          <div class="contson" id="contsonc35a60c1a8e2">
            床前明月光，疑是地上霜。<br />举头望明月，低头思故乡。
          </div>
        </div>
      </div>
    </div>
    <a href="javascript:fanyiShow(687,'4404F843AFA5E4FC','c35a60c1a8e2')">展开阅读全文</a>
  `;

  assert.deepEqual(extractDetailPayload(html, "/shiwenv_c35a60c1a8e2.aspx"), {
    ajaxId: "687",
    author: "李白",
    idStr: "c35a60c1a8e2",
    idjm: "4404F843AFA5E4FC",
    lines: ["床前明月光，疑是地上霜。", "举头望明月，低头思故乡。"],
    title: "静夜思",
  });
});

test("extractDetailPayload tolerates pages that only inline translation content", () => {
  const html = `
    <div class="sons" id="sonsyuanwen">
      <div class="cont">
        <div id="zhengwen45c396367f59">
          <h1>行宫</h1>
          <p class="source"><a>元稹</a><a>〔唐代〕</a></p>
          <div class="contson" id="contson45c396367f59">
            寥落古行宫，宫花寂寞红。<br />白头宫女在，闲坐说玄宗。
          </div>
        </div>
      </div>
    </div>
    <div class="sons">
      <div class="contyishang">
        <h2><span>译文及注释</span></h2>
      </div>
    </div>
  `;

  assert.deepEqual(extractDetailPayload(html, "/shiwenv_45c396367f59.aspx"), {
    ajaxId: null,
    author: "元稹",
    idStr: "45c396367f59",
    idjm: null,
    lines: ["寥落古行宫，宫花寂寞红。", "白头宫女在，闲坐说玄宗。"],
    title: "行宫",
  });
});

test("parseTranslationAnnotation separates translation and annotation from ajax html", () => {
  const html = `
    <div class="contyishang">
      <p><strong>译文</strong><br />明亮的月光洒在床前，好像地上泛起了一层白霜。<br />我抬起头来，看那天窗外空中的明月，不由得低头沉思，想起远方的家乡。</p>
      <p><strong>注释</strong><br />静夜思：静静的夜里，产生的思绪。<br />举头：抬头。<a title="收起" href="javascript:fanyiClose(687)">▲</a></p>
    </div>
  `;

  assert.deepEqual(parseTranslationAnnotation(html), {
    annotation: "静夜思：静静的夜里，产生的思绪。\n举头：抬头。",
    translation: "明亮的月光洒在床前，好像地上泛起了一层白霜。\n我抬起头来，看那天窗外空中的明月，不由得低头沉思，想起远方的家乡。",
  });
});

test("matchDetailToPoetry falls back to author plus normalized lines when titles differ", () => {
  const detail = {
    ajaxId: "687",
    author: "王建",
    idStr: "example",
    idjm: "TOKEN",
    lines: ["三日入厨下，洗手作羹汤。", "未谙姑食性，先遣小姑尝。"],
    title: "新嫁娘词",
  };

  const poetryId = matchDetailToPoetry(detail, [
    {
      author: "王建",
      id: "ts300-0008",
      lines: ["三日入厨下，洗手作羹汤。", "未谙姑食性，先遣小姑尝。"],
      title: "新嫁娘词三首 三",
    },
  ]);

  assert.equal(poetryId, "ts300-0008");
});

test("matchDetailToPoetry allows line-only matching within the same author set", () => {
  const detail = {
    ajaxId: null,
    author: "王之涣",
    idStr: "example",
    idjm: null,
    lines: ["黄河远上白云间，一片孤城万仞山。", "羌笛何须怨杨柳，春风不度玉门关。"],
    title: "凉州词",
  };

  const poetryId = matchDetailToPoetry(detail, [
    {
      author: "王之涣",
      id: "ts300-0006",
      lines: ["黄河远上白云间，一片孤城万仞山。", "羌笛何须怨杨柳，春风不度玉门关。"],
      title: "横吹曲辞 出塞",
    },
    {
      author: "王之涣",
      id: "ts300-9999",
      lines: ["白日依山尽，黄河入海流。", "欲穷千里目，更上一层楼。"],
      title: "登鹳雀楼",
    },
  ]);

  assert.equal(poetryId, "ts300-0006");
});

test("matchDetailToPoetry tolerates minor line variants within the same author set", () => {
  const detail = {
    ajaxId: null,
    author: "李白",
    idStr: "example",
    idjm: null,
    lines: ["一枝红艳露凝香，云雨巫山枉断肠。", "借问汉宫谁得似，可怜飞燕倚新妆。"],
    title: "清平调·其二",
  };

  const poetryId = matchDetailToPoetry(detail, [
    {
      author: "李白",
      id: "ts300-0175",
      lines: ["一枝红艳露凝香，云雨巫山枉断肠。", "借问汉宫谁得似，可怜飞燕倚新妆。"],
      title: "清平调 二",
    },
    {
      author: "李白",
      id: "ts300-0310",
      lines: ["一枝秾艳露凝香，云雨巫山枉断肠。", "借问汉宫谁得似，可怜飞燕倚新妆。"],
      title: "清平调词三首 二",
    },
  ]);

  assert.equal(poetryId, "ts300-0175");
});

test("findNormalizedFallbackPoetry finds a missing poem from normalized source by author and lines", () => {
  const detail = {
    ajaxId: null,
    author: "李白",
    idStr: "example",
    idjm: null,
    lines: ["一枝秾艳露凝香，云雨巫山枉断肠。", "借问汉宫谁得似，可怜飞燕倚新妆。"],
    title: "清平调·其二",
  };

  const fallback = findNormalizedFallbackPoetry(detail, [
    {
      author: "李白",
      difficulty: 3,
      id: "ts300-0310",
      imageKey: "ts300-0310",
      imageStatus: "placeholder",
      lines: ["一枝秾艳露凝香，云雨巫山枉断肠。", "借问汉宫谁得似，可怜飞燕倚新妆。"],
      linesZhHans: ["一枝秾艳露凝香，云雨巫山枉断肠。", "借问汉宫谁得似，可怜飞燕倚新妆。"],
      linesZhHant: ["一枝穠豔露凝香，雲雨巫山枉斷腸。", "借問漢宮誰得似，可憐飛燕倚新妝。"],
      sourceId: 310,
      sourceUid: "99167d13-8e2c-4b75-bf93-62b0682dfdd0",
      tags: ["唐诗三百首", "乐府"],
      themes: ["乐府"],
      title: "清平调词三首 二",
      titleOriginal: "清平調詞三首 二",
      titleZhHans: "清平调词三首 二",
      titleZhHant: "清平調詞三首 二",
      authorOriginal: "李白",
      authorZhHans: "李白",
      authorZhHant: "李白",
      dynasty: "唐",
    },
  ]);

  assert.equal(fallback?.id, "ts300-0310");
});

test("matchDetailToPoetry supports configured title aliases", () => {
  const detail = {
    ajaxId: null,
    author: "白居易",
    idStr: "example",
    idjm: null,
    lines: [
      "浔阳江头夜送客，枫叶荻花秋瑟瑟。",
      "主人下马客在船，举酒欲饮无管弦。",
    ],
    title: "琵琶行",
  };

  const poetryId = matchDetailToPoetry(detail, [
    {
      author: "白居易",
      id: "ts300-0179",
      lines: [
        "浔阳江头夜送客，枫叶荻花秋瑟瑟。",
        "主人下马客在船，举酒欲饮无管弦。",
      ],
      title: "琵琶引",
    },
  ]);

  assert.equal(poetryId, "ts300-0179");
});
