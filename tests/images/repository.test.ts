import test from "node:test";
import assert from "node:assert/strict";

import { getPoetryImage } from "@/lib/images/repository";

test("getPoetryImage returns a ready database asset when available", async () => {
  const result = await getPoetryImage("ts300-0001", {
    imageAsset: {
      findFirst: async () => ({
        poetryId: "ts300-0001",
        style: "storybook-watercolor",
        status: "ready",
        promptVersion: "v1",
        imagePath: "/images/generated/ts300-0001.jpg",
        thumbPath: "/images/generated/ts300-0001-thumb.jpg",
        width: 1200,
        height: 675,
      }),
    },
  });

  assert.deepEqual(result, {
    poetryId: "ts300-0001",
    imagePath: "/images/generated/ts300-0001.jpg",
    thumbPath: "/images/generated/ts300-0001-thumb.jpg",
    status: "ready",
    style: "storybook-watercolor",
    promptVersion: "v1",
    width: 1200,
    height: 675,
    isPlaceholder: false,
  });
});

test("getPoetryImage falls back to the default placeholder when no ready asset exists", async () => {
  const result = await getPoetryImage("ts300-0002", {
    imageAsset: {
      findFirst: async () => null,
    },
  });

  assert.deepEqual(result, {
    poetryId: "ts300-0002",
    imagePath: "/images/placeholders/default-poetry-card.jpg",
    thumbPath: "/images/placeholders/default-poetry-card.jpg",
    status: "placeholder",
    style: "storybook-watercolor",
    promptVersion: "v1",
    width: null,
    height: null,
    isPlaceholder: true,
  });
});

test("getPoetryImage only queries ready assets for the requested poetry id", async () => {
  const calls: unknown[] = [];

  await getPoetryImage("ts300-0121", {
    imageAsset: {
      findFirst: async (args: unknown) => {
        calls.push(args);
        return null;
      },
    },
  });

  assert.deepEqual(calls, [
    {
      where: {
        poetryId: "ts300-0121",
        status: "ready",
      },
      select: {
        poetryId: true,
        style: true,
        status: true,
        promptVersion: true,
        imagePath: true,
        thumbPath: true,
        width: true,
        height: true,
      },
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
    },
  ]);
});
