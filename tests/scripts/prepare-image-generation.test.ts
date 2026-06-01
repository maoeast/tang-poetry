import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzePoemMood,
  buildBatchJson,
  buildBatchJob,
  buildFormalBatches,
  buildImageAssetRecord,
  buildManifest,
  buildPoetryImagePrompt,
  buildPreviewBatch,
  filterThemes,
  loadPoems,
} from "@/scripts/prepare-image-generation";

// ---- analyzePoemMood ----

test("analyzePoemMood returns spring-like mood for spring morning poem", () => {
  const mood = analyzePoemMood({
    id: "ts300-0001",
    title: "春晓",
    author: "孟浩然",
    dynasty: "唐",
    lines: ["春眠不觉晓，", "处处闻啼鸟。", "夜来风雨声，", "花落知多少。"],
    themes: ["春天", "写景", "惜春"],
  });

  assert.match(mood, /清新|明快|温柔/);
  assert.doesNotMatch(mood, /豪迈|苍凉|惊险/);
});

test("analyzePoemMood returns homesick mood for 静夜思", () => {
  const mood = analyzePoemMood({
    id: "ts300-0002",
    title: "静夜思",
    author: "李白",
    dynasty: "唐",
    lines: ["床前明月光，", "疑是地上霜。", "举头望明月，", "低头思故乡。"],
    themes: ["思乡", "月夜"],
  });

  assert.match(mood, /思乡|安静|柔和/);
});

test("analyzePoemMood returns heroic mood for 将进酒", () => {
  const mood = analyzePoemMood({
    id: "custom-jiangjinjiu",
    title: "将进酒",
    author: "李白",
    dynasty: "唐",
    lines: [
      "君不见黄河之水天上来，奔流到海不复回。",
      "君不见高堂明镜悲白发，朝如青丝暮成雪。",
      "人生得意须尽欢，莫使金樽空对月。",
    ],
    themes: ["豪放", "饮酒", "黄河"],
  });

  assert.match(mood, /豪迈|纵情|开阔/);
});

test("analyzePoemMood returns frontier mood for 出塞", () => {
  const mood = analyzePoemMood({
    id: "frontier",
    title: "出塞",
    author: "王昌龄",
    dynasty: "唐",
    lines: ["秦时明月汉时关，", "万里长征人未还。"],
    themes: ["边塞", "战争"],
  });

  assert.match(mood, /苍凉|壮阔/);
});

test("analyzePoemMood returns peril mood for 蜀道难", () => {
  const mood = analyzePoemMood({
    id: "custom-shudaonan",
    title: "蜀道难",
    author: "李白",
    dynasty: "唐",
    lines: [
      "噫吁嚱，危乎高哉。",
      "蜀道之难，难于上青天。",
      "上有六龙回日之高标，下有冲波逆折之回川。",
    ],
    themes: ["山路", "险峻", "惊险"],
  });

  assert.match(mood, /惊险|雄奇/);
});

test("analyzePoemMood returns prison-cicada mood for 在狱咏蝉", () => {
  const mood = analyzePoemMood({
    id: "ts300-0001",
    title: "在狱咏蝉",
    author: "骆宾王",
    dynasty: "唐",
    lines: [
      "西陆蝉声唱，南冠客思侵。",
      "那堪玄鬓影，来对白头吟。",
    ],
    themes: ["咏物"],
  });

  assert.match(mood, /克制|清冷|压抑/);
});

test("analyzePoemMood does not leak prison-cicada mood into ordinary cicada poems", () => {
  const mood = analyzePoemMood({
    id: "ts300-0011",
    title: "蝉",
    author: "李商隐",
    dynasty: "唐",
    lines: [
      "本以高难饱，徒劳恨费声。",
      "五更疏欲断，一树碧无情。",
    ],
    themes: ["咏物"],
  });

  assert.doesNotMatch(mood, /克制、清冷、压抑/);
});

test("analyzePoemMood falls back to gentle default for plain descriptive poems", () => {
  const mood = analyzePoemMood({
    id: "unknown",
    title: "田园小景",
    author: "佚名",
    dynasty: "唐",
    lines: ["远看山有色，", "近听水无声。"],
    themes: ["写景"],
  });

  assert.match(mood, /宁静|温柔|儿童/);
});

// ---- filterThemes ----

test("filterThemes removes curricular metadata labels", () => {
  const filtered = filterThemes([
    "思乡",
    "隋・唐・五代",
    "八年级下册(课外)",
    "初中古诗",
    "七言律诗",
    "五言绝句",
    "乐府",
    "新乐府辞",
    "五言古诗",
    "七言古诗",
    "古体",
    "长诗",
  ]);

  assert.deepEqual(filtered, ["思乡"]);
});

test("filterThemes keeps valid poetic themes", () => {
  const filtered = filterThemes([
    "思乡",
    "边塞",
    "山水",
    "咏物",
    "抒情",
    "送别",
    "战争",
  ]);

  assert.deepEqual(filtered, ["思乡", "边塞", "山水", "咏物", "抒情", "送别", "战争"]);
});

// ---- buildPoetryImagePrompt (simplified path, no sceneDescription) ----

test("buildPoetryImagePrompt without scene description uses simplified mood-based template", () => {
  const prompt = buildPoetryImagePrompt({
    id: "ts300-0003",
    title: "登幽州台歌",
    author: "陈子昂",
    dynasty: "唐",
    lines: ["前不见古人，", "后不见来者。", "念天地之悠悠，", "独怆然而涕下。"],
    themes: ["登高", "伤怀"],
  });

  assert.match(prompt, /诗名：/);
  assert.match(prompt, /作者：/);
  assert.match(prompt, /朝代：/);
  assert.match(prompt, /诗句摘录：/);
  assert.match(prompt, /主题关键词：/);
  assert.match(prompt, /情绪基调：/);
  assert.match(prompt, /不要出现文字、水印、拼音、诗句排版/);
  assert.match(prompt, /优先依据诗句自身意象理解与构图/);
  assert.match(prompt, /不要套用固定边塞\/春庭\/月夜模板/);
  // Simplified path should NOT have 诗意画面
  assert.doesNotMatch(prompt, /诗意画面：/);
});

test("buildPoetryImagePrompt filters curricular themes from keywords", () => {
  const prompt = buildPoetryImagePrompt({
    id: "ts300-0002",
    title: "登幽州台歌",
    author: "陈子昂",
    dynasty: "唐",
    lines: ["前不见古人，", "后不见来者。"],
    themes: ["隋・唐・五代", "八年级下册(课外)", "伤怀", "初中古诗", "七言古诗"],
  });

  assert.match(prompt, /主题关键词：伤怀/);
  assert.doesNotMatch(prompt, /隋・唐/);
  assert.doesNotMatch(prompt, /八年级/);
  assert.doesNotMatch(prompt, /初中古诗/);
  assert.doesNotMatch(prompt, /七言古诗/);
});

test("buildPoetryImagePrompt keeps visual style markers (2:3 moved to API params)", () => {
  const prompt = buildPoetryImagePrompt({
    id: "spring",
    title: "春晓",
    author: "孟浩然",
    dynasty: "唐",
    lines: ["春眠不觉晓，", "处处闻啼鸟。"],
    themes: ["春天"],
  });

  assert.match(prompt, /竖版/);
  assert.match(prompt, /水彩/);
  assert.match(prompt, /低饱和/);
  assert.match(prompt, /儿童/);
  // 2:3 is passed as API parameter, not in prompt text
  assert.doesNotMatch(prompt, /2:3/);
});

test("buildPoetryImagePrompt varies mood by poem content", () => {
  const springPrompt = buildPoetryImagePrompt({
    id: "spring",
    title: "春晓",
    author: "孟浩然",
    dynasty: "唐",
    lines: ["春眠不觉晓，", "处处闻啼鸟。"],
    themes: ["春天", "写景"],
  });

  const frontierPrompt = buildPoetryImagePrompt({
    id: "frontier",
    title: "出塞",
    author: "王昌龄",
    dynasty: "唐",
    lines: ["秦时明月汉时关，", "万里长征人未还。"],
    themes: ["边塞", "战争"],
  });

  assert.match(springPrompt, /清新、明快、温柔/);
  assert.match(frontierPrompt, /苍凉、壮阔、带克制张力/);
  assert.match(springPrompt, /优先依据诗句自身意象理解与构图/);
  assert.match(frontierPrompt, /优先依据诗句自身意象理解与构图/);
});

test("buildPoetryImagePrompt uses prison-cicada mood for 在狱咏蝉", () => {
  const prompt = buildPoetryImagePrompt({
    id: "ts300-0001",
    title: "在狱咏蝉",
    author: "骆宾王",
    dynasty: "唐",
    lines: [
      "西陆蝉声唱，南冠客思侵。",
      "那堪玄鬓影，来对白头吟。",
    ],
    themes: ["咏物"],
  });

  assert.match(prompt, /克制、清冷、压抑中仍守高洁/);
  assert.doesNotMatch(prompt, /诗意画面：/);
});

// ---- buildPoetryImagePrompt (personalized path, with sceneDescription) ----

test("buildPoetryImagePrompt with scene description uses personalized template", () => {
  const sceneDesc = "秋日清晨，远山如黛，江面薄雾弥漫。一叶扁舟漂在江心，舟上渔翁披蓑戴笠。";

  const prompt = buildPoetryImagePrompt({
    id: "ts300-0050",
    title: "江雪",
    author: "柳宗元",
    dynasty: "唐",
    lines: ["千山鸟飞绝，", "万径人踪灭。"],
    themes: ["山水", "写景"],
  }, sceneDesc);

  // Personalized template markers
  assert.match(prompt, /诗意画面：/);
  assert.match(prompt, /秋日清晨，远山如黛/);
  // Should NOT have simplified path markers
  assert.doesNotMatch(prompt, /情绪基调：/);
  assert.doesNotMatch(prompt, /优先依据诗句自身意象理解与构图/);
  // Common elements still present
  assert.match(prompt, /诗名：江雪/);
  assert.match(prompt, /竖版/);
  assert.match(prompt, /水彩/);
  assert.match(prompt, /不要出现文字、水印、拼音/);
});

test("buildPoetryImagePrompt personalized path still filters curricular themes", () => {
  const prompt = buildPoetryImagePrompt({
    id: "ts300-0002",
    title: "登幽州台歌",
    author: "陈子昂",
    dynasty: "唐",
    lines: ["前不见古人，", "后不见来者。"],
    themes: ["隋・唐・五代", "八年级下册(课外)", "伤怀", "初中古诗"],
  }, "幽州古台上，一人独立远眺，天地苍茫。");

  assert.match(prompt, /主题关键词：伤怀/);
  assert.doesNotMatch(prompt, /八年级/);
  assert.doesNotMatch(prompt, /初中古诗/);
  assert.match(prompt, /诗意画面：幽州古台上/);
});

// ---- loadPoems ----

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

// ---- batch / job builders ----

test("buildBatchJob uses poetry id as job name (simplified path)", () => {
  const job = buildBatchJob({
    id: "ts300-0001",
    title: "春晓",
    author: "孟浩然",
    dynasty: "唐",
    lines: ["春眠不觉晓，", "处处闻啼鸟。"],
    themes: ["春天"],
  });

  assert.equal(job.name, "ts300-0001");
  assert.match(job.prompt, /竖版/);
  assert.match(job.prompt, /情绪基调：/);
});

test("buildBatchJob with scene description uses personalized prompt", () => {
  const job = buildBatchJob({
    id: "ts300-0001",
    title: "春晓",
    author: "孟浩然",
    dynasty: "唐",
    lines: ["春眠不觉晓，", "处处闻啼鸟。"],
    themes: ["春天"],
  }, "春日清晨，庭院花开，鸟鸣枝头。");

  assert.equal(job.name, "ts300-0001");
  assert.match(job.prompt, /诗意画面：春日清晨/);
  assert.doesNotMatch(job.prompt, /情绪基调：/);
});

test("buildImageAssetRecord creates placeholder import records before generation", () => {
  assert.deepEqual(buildImageAssetRecord("ts300-0001"), {
    poetryId: "ts300-0001",
    style: "storybook-watercolor",
    status: "placeholder",
    promptVersion: "v2",
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

  assert.match(manifest, /AIimages\/batches\/poetry-image-batch-01-preview\.json/);
  assert.match(manifest, /AIimages\/batches\//);
  assert.match(manifest, /data\/image-assets\.json/);
  assert.match(manifest, /默认目标尺寸：2:3/);
  assert.match(manifest, /个性化进度缓存/);
});

test("buildBatchJson applies shared defaults to batch payloads", () => {
  const batch = buildBatchJson([
    {
      name: "ts300-0001",
      prompt: "prompt",
    },
  ]);

  assert.deepEqual(batch.defaults, {
    size: "2:3",
    resolution: "2k",
  });
  assert.equal(batch.jobs.length, 1);
});

test("buildPreviewBatch emits the fixed three-poem preview set", () => {
  const batch = buildPreviewBatch([
    {
      id: "ts300-0001",
      title: "在狱咏蝉",
      author: "骆宾王",
      dynasty: "唐",
      lines: ["西陆蝉声唱，", "南冠客思侵。"],
      themes: ["咏物"],
    },
    {
      id: "ts300-0002",
      title: "登幽州台歌",
      author: "陈子昂",
      dynasty: "唐",
      lines: ["前不见古人，", "后不见来者。"],
      themes: ["伤怀"],
    },
    {
      id: "ts300-0003",
      title: "经邹鲁祭孔子而叹之",
      author: "唐玄宗",
      dynasty: "唐",
      lines: ["夫子何为者？", "栖栖一代中。"],
      themes: ["写人"],
    },
    {
      id: "ts300-0004",
      title: "鼓吹曲辞 将进酒",
      author: "李白",
      dynasty: "唐",
      lines: ["君不见黄河之水天上来，", "奔流到海不复回。"],
      themes: ["黄河"],
    },
  ]);

  assert.deepEqual(
    batch.jobs.map((job) => job.name),
    ["ts300-0001", "ts300-0002", "ts300-0004"],
  );
});

test("buildFormalBatches splits full jobs into 40-poem chunks", () => {
  const poems = Array.from({ length: 81 }, (_, index) => ({
    id: `ts300-${String(index + 1).padStart(4, "0")}`,
    title: `诗${index + 1}`,
    author: "作者",
    dynasty: "唐",
    lines: ["其一", "其二"],
    themes: ["主题"],
  }));

  const batches = buildFormalBatches(poems, 40);

  assert.deepEqual(
    batches.map((batch) => batch.filename),
    [
      "poetry-image-batch-01.json",
      "poetry-image-batch-02.json",
      "poetry-image-batch-03.json",
    ],
  );
  assert.deepEqual(
    batches.map((batch) => batch.batch.jobs.length),
    [40, 40, 1],
  );
});
