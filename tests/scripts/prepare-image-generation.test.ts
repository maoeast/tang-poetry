import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzePoemImagery,
  buildBatchJob,
  buildImageAssetRecord,
  buildManifest,
  buildPoetryImagePrompt,
  loadPoems,
} from "@/scripts/prepare-image-generation";

test("analyzePoemImagery extracts scene and mood from spring morning poetry", () => {
  const analysis = analyzePoemImagery({
    id: "ts300-0001",
    title: "春晓",
    author: "孟浩然",
    dynasty: "唐",
    lines: ["春眠不觉晓，", "处处闻啼鸟。", "夜来风雨声，", "花落知多少。"],
    themes: ["春天", "写景", "惜春"],
  });

  assert.match(analysis.sceneSummary, /春晨|春天|花枝|庭院/);
  assert.match(analysis.moodSummary, /轻柔|清新|怜惜|宁静/);
  assert.match(analysis.subjectSummary, /孩子|小鸟|花枝|窗前/);
});

test("analyzePoemImagery extracts solitude and moonlit homesickness cues", () => {
  const analysis = analyzePoemImagery({
    id: "ts300-0002",
    title: "静夜思",
    author: "李白",
    dynasty: "唐",
    lines: ["床前明月光，", "疑是地上霜。", "举头望明月，", "低头思故乡。"],
    themes: ["思乡", "月夜"],
  });

  assert.match(analysis.sceneSummary, /月夜|窗前|清光|夜色/);
  assert.match(analysis.moodSummary, /思乡|安静|柔和|淡淡的想念/);
  assert.match(analysis.subjectSummary, /孩子|月亮|窗|床前/);
});

test("buildPoetryImagePrompt includes imagery analysis instead of only generic style terms", () => {
  const prompt = buildPoetryImagePrompt({
    id: "ts300-0003",
    title: "登幽州台歌",
    author: "陈子昂",
    dynasty: "唐",
    lines: ["前不见古人，", "后不见来者。", "念天地之悠悠，", "独怆然而涕下。"],
    themes: ["登高", "伤怀"],
  });

  assert.match(prompt, /诗意场景/);
  assert.match(prompt, /情绪氛围/);
  assert.match(prompt, /画面主体/);
  assert.match(prompt, /不要出现文字、水印、拼音、诗句排版/);
});

test("loadPoems parses normalized poetry json records", () => {
  const poems = loadPoems(
    JSON.stringify([
      {
        id: "ts300-0001",
        title: "春晓",
        author: "孟浩然",
        dynasty: "唐",
        lines: ["春眠不觉晓，", "处处闻啼鸟。"],
        themes: ["春天"],
      },
    ]),
  );

  assert.equal(poems.length, 1);
  assert.equal(poems[0]?.title, "春晓");
  assert.deepEqual(poems[0]?.lines, ["春眠不觉晓，", "处处闻啼鸟。"]);
});

test("buildBatchJob uses poetry id as job name and keeps 2:3 oriented prompt intent", () => {
  const job = buildBatchJob({
    id: "ts300-0001",
    title: "春晓",
    author: "孟浩然",
    dynasty: "唐",
    lines: ["春眠不觉晓，", "处处闻啼鸟。"],
    themes: ["春天"],
  });

  assert.equal(job.name, "ts300-0001");
  assert.match(job.prompt, /2:3/);
  assert.match(job.prompt, /诗意场景/);
});

test("buildImageAssetRecord creates placeholder import records before generation", () => {
  assert.deepEqual(buildImageAssetRecord("ts300-0001"), {
    poetryId: "ts300-0001",
    style: "storybook-watercolor",
    status: "placeholder",
    promptVersion: "v1",
    imagePath: "/images/placeholders/default-poetry-card.jpg",
    thumbPath: "/images/placeholders/default-poetry-card.jpg",
  });
});

test("buildManifest documents generated batch outputs", () => {
  const manifest = buildManifest([
    {
      id: "ts300-0001",
      title: "春晓",
      author: "孟浩然",
      dynasty: "唐",
      lines: ["春眠不觉晓，", "处处闻啼鸟。"],
      themes: ["春天"],
    },
  ]);

  assert.match(manifest, /AIimage\/poetry-image-batch\.json/);
  assert.match(manifest, /data\/image-assets\.json/);
  assert.match(manifest, /默认目标尺寸：2:3/);
});
