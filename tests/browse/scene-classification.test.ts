import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyByScene,
  SCENE_CATEGORIES,
} from "../../lib/browse/scene-classification";

describe("classifyByScene", () => {
  it("matches ts300 tag '春天' to spring category", () => {
    const result = classifyByScene(["春天"], "春晓", ["春眠不觉晓", "处处闻啼鸟"]);
    assert.ok(result.includes("spring"));
  });

  it("matches ts300 tag '送别' to farewell category", () => {
    const result = classifyByScene(["送别"], "赠汪伦", []);
    assert.ok(result.includes("farewell"));
  });

  it("matches ts300 tag '悯农' to meal category", () => {
    const result = classifyByScene(["悯农"], "悯农", ["锄禾日当午"]);
    assert.ok(result.includes("meal"));
  });

  it("matches ts300 tag '月亮' to night category", () => {
    const result = classifyByScene(["月亮"], "静夜思", ["床前明月光"]);
    assert.ok(result.includes("night"));
  });

  it("matches ts300 tag '冬天' and '写雪' to winter category", () => {
    const result = classifyByScene(["冬天", "写雪"], "江雪", ["千山鸟飞绝"]);
    assert.ok(result.includes("winter"));
  });

  it("matches ts300 tag '登高' to climb category", () => {
    const result = classifyByScene(["登高"], "登鹳雀楼", ["白日依山尽"]);
    assert.ok(result.includes("climb"));
  });

  it("matches ts300 tag '中秋' to festival category", () => {
    const result = classifyByScene(["中秋"], "望月怀远", []);
    assert.ok(result.includes("festival"));
  });

  it("matches keyword in title for untagged poems", () => {
    // gs300 poem without scene tags
    const result = classifyByScene(["古诗三百"], "长歌行", ["青青园中葵", "朝露待日晞", "阳春布德泽"]);
    assert.ok(result.includes("spring"));
  });

  it("matches keyword in lines content", () => {
    const result = classifyByScene([], "池上", ["小娃撑小艇", "偷采白莲回"]);
    assert.ok(result.includes("summer"));
  });

  it("returns multiple categories for multi-themed poems", () => {
    // 秋夕: has autumn in title and stars/moon in content
    const result = classifyByScene([], "秋夕", ["银烛秋光冷画屏", "坐看牵牛织女星"]);
    assert.ok(result.includes("autumn"));
    assert.ok(result.includes("night"));
  });

  it("returns empty array for poems matching no categories", () => {
    const result = classifyByScene([], "杂诗", ["君自故乡来"]);
    // "故乡" should match "missing" category
    assert.ok(result.length > 0);
  });

  it("春晓 matches morning and spring", () => {
    const result = classifyByScene([], "春晓", ["春眠不觉晓", "处处闻啼鸟"]);
    assert.ok(result.includes("morning")); // 晓
    assert.ok(result.includes("spring"));  // 春风/春
  });

  it("咏鹅 matches birds category", () => {
    const result = classifyByScene([], "咏鹅", ["鹅鹅鹅", "曲项向天歌", "白毛浮绿水"]);
    assert.ok(result.includes("birds"));
  });

  it("matches '蝉' title to insects category", () => {
    const result = classifyByScene([], "蝉", ["居高声自远", "非是藉秋风"]);
    assert.ok(result.includes("insects"));
  });

  it("matches 寻隐者不遇 to seek category", () => {
    const result = classifyByScene(["寻访"], "寻隐者不遇", ["松下问童子", "言师采药去"]);
    assert.ok(result.includes("seek"));
  });

  it("matches 登鹳雀楼 to climb via keywords", () => {
    const result = classifyByScene([], "登鹳雀楼", ["白日依山尽", "欲穷千里目"]);
    assert.ok(result.includes("climb"));
  });

  it("matches 元日 to festival via keywords", () => {
    const result = classifyByScene(["春节"], "元日", ["爆竹声中一岁除", "春风送暖入屠苏"]);
    assert.ok(result.includes("festival"));
  });

  it("风 matches weather category", () => {
    const result = classifyByScene(["写风", "风"], "风", ["解落三秋叶", "能开二月花"]);
    assert.ok(result.includes("weather"));
  });
});

describe("SCENE_CATEGORIES", () => {
  it("has exactly 17 categories", () => {
    assert.strictEqual(SCENE_CATEGORIES.length, 17);
  });

  it("all categories have unique tags", () => {
    const tags = SCENE_CATEGORIES.map((c) => c.tag);
    assert.strictEqual(new Set(tags).size, tags.length);
  });

  it("all categories have non-empty labels", () => {
    for (const cat of SCENE_CATEGORIES) {
      assert.ok(cat.label.length > 0, `${cat.tag} has empty label`);
    }
  });
});
