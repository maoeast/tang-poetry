import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getAllPoetryImages,
  getPlaceholderImage,
} from "../../lib/images/repository";

describe("getAllPoetryImages", () => {
  it("returns empty map when no assets", async () => {
    const repo = {
      imageAsset: {
        findMany: async () => [],
      },
    };
    const map = await getAllPoetryImages(repo as never);
    assert.equal(map.size, 0);
  });

  it("returns map keyed by poetryId", async () => {
    const assets = [
      {
        poetryId: "p1",
        style: "storybook-watercolor",
        status: "ready",
        promptVersion: "v1",
        imagePath: "/images/generated/p1.png",
        thumbPath: null,
        width: 1024,
        height: 1536,
      },
      {
        poetryId: "p2",
        style: "storybook-watercolor",
        status: "ready",
        promptVersion: "v1",
        imagePath: "/images/generated/p2.png",
        thumbPath: null,
        width: 1024,
        height: 1536,
      },
    ];

    const repo = {
      imageAsset: {
        findMany: async () => assets,
      },
    };

    const map = await getAllPoetryImages(repo as never);
    assert.equal(map.size, 2);
    assert.equal(map.get("p1")?.imagePath, "/images/generated/p1.png");
    assert.equal(map.get("p2")?.imagePath, "/images/generated/p2.png");
  });

  it("picks latest when multiple assets exist for same poetryId", async () => {
    const assets = [
      {
        poetryId: "p1",
        style: "v2",
        status: "ready",
        promptVersion: "v2",
        imagePath: "/images/generated/p1-v2.png",
        thumbPath: null,
        width: 1024,
        height: 1536,
      },
      {
        poetryId: "p1",
        style: "v1",
        status: "ready",
        promptVersion: "v1",
        imagePath: "/images/generated/p1-v1.png",
        thumbPath: null,
        width: 512,
        height: 768,
      },
    ];

    const repo = {
      imageAsset: {
        findMany: async () => assets,
      },
    };

    const map = await getAllPoetryImages(repo as never);
    assert.equal(map.size, 1);
    assert.equal(map.get("p1")?.imagePath, "/images/generated/p1-v2.png");
  });
});

describe("getPlaceholderImage", () => {
  it("returns placeholder with isPlaceholder true", () => {
    const img = getPlaceholderImage("test-id");
    assert.equal(img.isPlaceholder, true);
    assert.equal(img.poetryId, "test-id");
    assert.equal(img.status, "placeholder");
  });
});
