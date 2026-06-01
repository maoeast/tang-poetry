import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getAuthorByName,
  getPoemsByAuthor,
} from "../../lib/author/repository";
import type { AuthorData } from "../../lib/author/repository";
import { getPlaceholderImage } from "../../lib/images/repository";

const testData: AuthorData[] = [
  {
    name: "李白",
    nameZhHant: "李白",
    avatarUrl: "/images/authors/libai.jpg",
    dynasty: "唐",
    courtesyName: "太白",
    literaryName: "青莲居士",
    bio: "李白简介简体",
    bioZhHant: "李白簡介繁體",
    lifeStory: "李白生平简体",
    lifeStoryZhHant: "李白生平繁體",
    sourceUrl: "https://example.com/libai",
  },
  {
    name: "无名氏",
    nameZhHant: null,
    avatarUrl: null,
    dynasty: "唐",
    courtesyName: null,
    literaryName: null,
    bio: null,
    bioZhHant: null,
    lifeStory: null,
    lifeStoryZhHant: null,
    sourceUrl: null,
  },
];

describe("getAuthorByName", () => {
  it("returns author by name with zh-Hans variant", async () => {
    const result = await getAuthorByName("李白", "zh-Hans", testData);

    assert.ok(result);
    assert.equal(result.name, "李白");
    assert.equal(result.avatarUrl, "/images/authors/libai.jpg");
    assert.equal(result.dynasty, "唐");
    assert.equal(result.courtesyName, "太白");
    assert.equal(result.literaryName, "青莲居士");
    assert.equal(result.bio, "李白简介简体");
    assert.equal(result.lifeStory, "李白生平简体");
    assert.equal(result.sourceUrl, "https://example.com/libai");
  });

  it("returns zh-Hant variant when requested", async () => {
    const result = await getAuthorByName("李白", "zh-Hant", testData);

    assert.ok(result);
    assert.equal(result.bio, "李白簡介繁體");
    assert.equal(result.lifeStory, "李白生平繁體");
  });

  it("falls back to zh-Hans bio when zh-Hant is null", async () => {
    const result = await getAuthorByName("无名氏", "zh-Hant", testData);

    assert.ok(result);
    assert.equal(result.bio, null);
    assert.equal(result.lifeStory, null);
  });

  it("returns null for unknown author", async () => {
    const result = await getAuthorByName("不存在", "zh-Hans", testData);
    assert.equal(result, null);
  });

  it("uses default avatar when avatarUrl is null", async () => {
    const result = await getAuthorByName("无名氏", "zh-Hans", testData);

    assert.ok(result);
    assert.equal(result.avatarUrl, "/images/authors/default.svg");
  });
});

// --- getPoemsByAuthor tests ---

function makePoem(
  id: string,
  tags: string[],
  overrides?: {
    titleZhHant?: string;
    authorZhHant?: string;
    difficulty?: number;
  },
) {
  return {
    id,
    title: `诗题${id}`,
    author: "李白",
    dynasty: "唐",
    lines: ["第一句内容", "第二句内容"],
    tags,
    difficulty: overrides?.difficulty ?? 1,
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

describe("getPoemsByAuthor", () => {
  it("returns poems sorted by difficulty ascending", async () => {
    const poems = [
      makePoem("3", ["五言绝句"], { difficulty: 3 }),
      makePoem("1", ["七言绝句"], { difficulty: 1 }),
      makePoem("2", ["乐府"], { difficulty: 2 }),
    ];

    const result = await getPoemsByAuthor(
      "李白",
      "zh-Hans",
      makeMockRepo(poems) as never,
      { getAllImages: async () => emptyImageMap },
    );

    assert.equal(result.length, 3);
    assert.equal(result[0].id, "1");
    assert.equal(result[1].id, "2");
    assert.equal(result[2].id, "3");
  });

  it("extracts previewLine from first line", async () => {
    const poems = [makePoem("1", ["五言绝句"])];

    const result = await getPoemsByAuthor(
      "李白",
      "zh-Hans",
      makeMockRepo(poems) as never,
      { getAllImages: async () => emptyImageMap },
    );

    assert.equal(result[0].previewLine, "第一句内容");
  });

  it("classifies form tag from poem tags", async () => {
    const poems = [makePoem("1", ["唐诗三百首", "五言绝句", "咏物"])];

    const result = await getPoemsByAuthor(
      "李白",
      "zh-Hans",
      makeMockRepo(poems) as never,
      { getAllImages: async () => emptyImageMap },
    );

    assert.equal(result[0].formTag, "五言绝句");
  });

  it("returns null formTag when no form tag matches", async () => {
    const poems = [makePoem("1", ["唐诗三百首", "咏物"])];

    const result = await getPoemsByAuthor(
      "李白",
      "zh-Hans",
      makeMockRepo(poems) as never,
      { getAllImages: async () => emptyImageMap },
    );

    assert.equal(result[0].formTag, null);
  });

  it("resolves zh-Hant variant", async () => {
    const poems = [
      makePoem("1", ["五言绝句"], {
        titleZhHant: "繁體標題",
        authorZhHant: "繁體作者",
      }),
    ];

    const result = await getPoemsByAuthor(
      "李白",
      "zh-Hant",
      makeMockRepo(poems) as never,
      { getAllImages: async () => emptyImageMap },
    );

    assert.equal(result[0].title, "繁體標題");
    assert.equal(result[0].author, "繁體作者");
  });

  it("uses placeholder image when no image in map", async () => {
    const poems = [makePoem("1", ["五言绝句"])];

    const result = await getPoemsByAuthor(
      "李白",
      "zh-Hans",
      makeMockRepo(poems) as never,
      { getAllImages: async () => emptyImageMap },
    );

    assert.equal(result[0].image.isPlaceholder, true);
  });

  it("uses real image when available in map", async () => {
    const poems = [makePoem("1", ["五言绝句"])];
    const imageMap = new Map([
      ["1", { ...placeholder, poetryId: "1", isPlaceholder: false }],
    ]);

    const result = await getPoemsByAuthor(
      "李白",
      "zh-Hans",
      makeMockRepo(poems) as never,
      { getAllImages: async () => imageMap },
    );

    assert.equal(result[0].image.isPlaceholder, false);
  });

  it("returns empty array when no poems found", async () => {
    const result = await getPoemsByAuthor(
      "李白",
      "zh-Hans",
      makeMockRepo([]) as never,
      { getAllImages: async () => emptyImageMap },
    );

    assert.equal(result.length, 0);
  });
});
