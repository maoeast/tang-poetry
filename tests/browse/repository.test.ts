import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getPoetryByCategories,
  FORM_TAGS,
} from "../../lib/browse/repository";
import { getPlaceholderImage } from "../../lib/images/repository";

function makePoem(
  id: string,
  tags: string[],
  overrides?: {
    titleZhHant?: string;
    authorZhHant?: string;
  },
) {
  return {
    id,
    title: `诗题${id}`,
    author: `作者${id}`,
    dynasty: "唐",
    tags,
    lines: ["第一句", "第二句"],
    titleZhHans: null,
    titleZhHant: overrides?.titleZhHant ?? null,
    authorZhHans: null,
    authorZhHant: overrides?.authorZhHant ?? null,
    linesZhHans: null,
    linesZhHant: null,
  };
}

const placeholder = getPlaceholderImage("test");

function makeMockRepo(poems: ReturnType<typeof makePoem>[]) {
  return {
    poetry: {
      findMany: async () => poems,
    },
  };
}

const emptyImageMap = new Map<string, ReturnType<typeof getPlaceholderImage>>();

describe("getPoetryByCategories", () => {
  it("groups poems by form tag", async () => {
    const poems = [
      makePoem("1", ["唐诗三百首", "五言绝句", "咏物"]),
      makePoem("2", ["唐诗三百首", "七言绝句"]),
      makePoem("3", ["乐府", "伤怀"]),
    ];

    const categories = await getPoetryByCategories(
      "zh-Hans",
      makeMockRepo(poems) as never,
      { getAllImages: async () => emptyImageMap },
    );

    // Only 3 categories have poems, no 未分类
    assert.equal(categories.length, 7);
    const wuyanJueju = categories.find((c) => c.tag === "五言绝句")!;
    assert.equal(wuyanJueju.count, 1);
    assert.equal(wuyanJueju.poems[0].id, "1");

    const qiyanJueju = categories.find((c) => c.tag === "七言绝句")!;
    assert.equal(qiyanJueju.count, 1);

    const yuefu = categories.find((c) => c.tag === "乐府")!;
    assert.equal(yuefu.count, 1);
  });

  it("puts poems without form tags into 未分类", async () => {
    const poems = [
      makePoem("1", ["唐诗三百首", "咏物"]),
      makePoem("2", []),
    ];

    const categories = await getPoetryByCategories(
      "zh-Hans",
      makeMockRepo(poems) as never,
      { getAllImages: async () => emptyImageMap },
    );

    const uncategorized = categories.find((c) => c.tag === "未分类")!;
    assert.equal(uncategorized.count, 2);
  });

  it("skips 未分类 when all poems have form tags", async () => {
    const poems = [makePoem("1", ["五言绝句"])];

    const categories = await getPoetryByCategories(
      "zh-Hans",
      makeMockRepo(poems) as never,
      { getAllImages: async () => emptyImageMap },
    );

    assert.equal(categories.length, 7);
    assert.ok(!categories.some((c) => c.tag === "未分类"));
  });

  it("resolves zh-Hant variant", async () => {
    const poems = [
      makePoem("1", ["五言绝句"], {
        titleZhHant: "繁體標題",
        authorZhHant: "繁體作者",
      }),
    ];

    const categories = await getPoetryByCategories(
      "zh-Hant",
      makeMockRepo(poems) as never,
      { getAllImages: async () => emptyImageMap },
    );

    const wuyan = categories.find((c) => c.tag === "五言绝句")!;
    assert.equal(wuyan.poems[0].title, "繁體標題");
    assert.equal(wuyan.poems[0].author, "繁體作者");
  });

  it("uses placeholder when no image exists", async () => {
    const poems = [makePoem("1", ["五言绝句"])];

    const categories = await getPoetryByCategories(
      "zh-Hans",
      makeMockRepo(poems) as never,
      { getAllImages: async () => emptyImageMap },
    );

    const poem = categories[0].poems[0];
    assert.equal(poem.image.isPlaceholder, true);
  });

  it("uses image from map when available", async () => {
    const poems = [makePoem("1", ["五言绝句"])];
    const imageMap = new Map([
      ["1", { ...placeholder, poetryId: "1", isPlaceholder: false }],
    ]);

    const categories = await getPoetryByCategories(
      "zh-Hans",
      makeMockRepo(poems) as never,
      { getAllImages: async () => imageMap },
    );

    assert.equal(categories[0].poems[0].image.isPlaceholder, false);
  });

  it("returns categories in FORM_TAGS order", async () => {
    const poems = FORM_TAGS.map((tag, i) => makePoem(`${i}`, [tag]));

    const categories = await getPoetryByCategories(
      "zh-Hans",
      makeMockRepo(poems) as never,
      { getAllImages: async () => emptyImageMap },
    );

    for (let i = 0; i < FORM_TAGS.length; i++) {
      assert.equal(categories[i].tag, FORM_TAGS[i]);
    }
  });

  it("assigns poem to first matching form tag", async () => {
    const poems = [makePoem("1", ["五言绝句", "乐府"])];

    const categories = await getPoetryByCategories(
      "zh-Hans",
      makeMockRepo(poems) as never,
      { getAllImages: async () => emptyImageMap },
    );

    assert.equal(categories.find((c) => c.tag === "五言绝句")!.count, 1);
    assert.equal(categories.find((c) => c.tag === "乐府")!.count, 0);
  });
});
