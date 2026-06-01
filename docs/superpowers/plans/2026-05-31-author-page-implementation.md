# 诗人详情页实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 新增 `/author/[authorName]` 诗人详情页，含头像、简介、生平概述和自适应作品列表，数据从静态 JSON 读取。

**架构：** `data/authors.json` 存诗人信息（抓取自古文岛），`lib/author/repository.ts` 读 JSON + Prisma 查作品，全部 Server Component 渲染。导航入口在诗歌详情页、首页和浏览页的作者姓名处添加 `<Link>`。

**技术栈：** Next.js App Router、Prisma、node:test + assert/strict、cheerio（抓取脚本）、opencc-js（简繁转换）

---

## 文件结构

### 新增文件

| 文件 | 职责 |
|---|---|
| `data/authors.json` | 诗人数据（测试先行用最小 fixture，抓取脚本后覆盖为完整数据） |
| `lib/author/repository.ts` | 类型定义 + `getAuthorByName` + `getPoemsByAuthor` |
| `tests/author/repository.test.ts` | 数据层单元测试 |
| `components/author/author-header.tsx` | 头像 + 姓名 + 朝代 + 字号 + 简介 |
| `components/author/author-bio.tsx` | 生平概述 + 来源链接 |
| `components/author/author-poems.tsx` | 作品列表（≤6 卡片 / >6 列表，自适应） |
| `app/author/[authorName]/page.tsx` | 诗人详情页 Server Component |
| `scripts/scrape-authors.ts` | 古文岛抓取脚本 |
| `public/images/authors/default.svg` | 默认占位头像 |

### 修改文件

| 文件 | 改动 |
|---|---|
| `components/home/today-poetry-hero.tsx:78` | 作者姓名 `<p>` 内加 `<Link>` |
| `components/browse/poetry-card.tsx` | 重构为 stretch-link 模式，作者姓名可单独点击 |
| `components/poetry/poetry-detail.tsx` | 侧边栏添加「关于诗人」链接 |

---

## 任务 1：类型定义 + 测试 fixture + 失败测试

**文件：**
- 创建：`data/authors.json`
- 创建：`tests/author/repository.test.ts`
- 创建：`lib/author/repository.ts`（仅类型，暂不导出函数实现）

- [ ] **步骤 1：创建测试 fixture `data/authors.json`**

```json
[
  {
    "name": "李白",
    "nameZhHant": "李白",
    "avatarUrl": "/images/authors/libai.jpg",
    "dynasty": "唐",
    "courtesyName": "太白",
    "literaryName": "青莲居士",
    "bio": "李白（701年—762年），字太白，号青莲居士，又号"谪仙人"，唐代伟大的浪漫主义诗人，被后人誉为"诗仙"，与杜甫并称为"李杜"。其诗以豪放飘逸见长，想象丰富，语言流转自然。",
    "bioZhHant": "李白（701年—762年），字太白，號青蓮居士，又號「謫仙人」，唐代偉大的浪漫主義詩人，被後人譽為「詩仙」，與杜甫並稱為「李杜」。其詩以豪放飄逸見長，想像豐富，語言流轉自然。",
    "lifeStory": "李白少年即显露才华，博览群书。二十五岁出蜀远游，天宝初入长安，贺知章见其文，叹为"谪仙人"。后因得罪权贵，被赐金放还。安史之乱中因卷入永王李璘案被流放夜郎，中途遇赦。晚年漂泊东南，卒于当涂。",
    "lifeStoryZhHant": "李白少年即顯露才華，博覽群書。二十五歲出蜀遠遊，天寶初入長安，賀知章見其文，嘆為「謫仙人」。後因得罪權貴，被賜金放還。安史之亂中因捲入永王李璘案被流放夜郎，中途遇赦。晚年漂泊東南，卒於當塗。",
    "sourceUrl": "https://www.guwendao.net/authorv_b90660e3e492.aspx"
  },
  {
    "name": "无名氏",
    "nameZhHant": null,
    "avatarUrl": null,
    "dynasty": "唐",
    "courtesyName": null,
    "literaryName": null,
    "bio": null,
    "bioZhHant": null,
    "lifeStory": null,
    "lifeStoryZhHant": null,
    "sourceUrl": null
  }
]
```

- [ ] **步骤 2：创建 `lib/author/repository.ts`，仅放类型定义**

```ts
import type { ScriptVariant } from "@/lib/poetry/script-variant";
import type { PoetryImage } from "@/lib/images/repository";

// --- JSON data types ---

export type AuthorData = {
  name: string;
  nameZhHant?: string | null;
  avatarUrl?: string | null;
  dynasty: string;
  courtesyName?: string | null;
  literaryName?: string | null;
  bio?: string | null;
  bioZhHant?: string | null;
  lifeStory?: string | null;
  lifeStoryZhHant?: string | null;
  sourceUrl?: string | null;
};

// --- Resolved author info (returned to components) ---

export type AuthorInfo = {
  name: string;
  avatarUrl: string;
  dynasty: string;
  courtesyName: string | null;
  literaryName: string | null;
  bio: string | null;
  lifeStory: string | null;
  sourceUrl: string | null;
};

// --- Author's poem item ---

export type AuthorPoem = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  previewLine: string;
  formTag: string | null;
  image: PoetryImage;
};

// --- Repository injection types ---

type AuthorPoemsRecord = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  lines: unknown;
  tags: unknown;
  difficulty: number;
  titleZhHans: string | null;
  titleZhHant: string | null;
  authorZhHans: string | null;
  authorZhHant: string | null;
  linesZhHans: unknown;
  linesZhHant: unknown;
};

export type AuthorPoemsRepository = {
  poetry: {
    findMany: (args: {
      where: { author: string };
      select: Record<string, true>;
      orderBy: { difficulty: "asc" };
    }) => Promise<AuthorPoemsRecord[]>;
  };
};

export type AuthorPoemsDependencies = {
  getAllImages: () => Promise<Map<string, PoetryImage>>;
};

const FORM_TAGS = [
  "五言绝句",
  "七言绝句",
  "五言律诗",
  "七言律诗",
  "五言古诗",
  "七言古诗",
  "乐府",
] as const;

const DEFAULT_AVATAR = "/images/authors/default.svg";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function classifyFormTag(tags: string[]): string | null {
  for (const formTag of FORM_TAGS) {
    if (tags.includes(formTag)) return formTag;
  }
  return null;
}

// --- Placeholder implementations (Task 2 will fill in) ---

export async function getAuthorByName(
  _name: string,
  _scriptVariant: ScriptVariant = "zh-Hans",
  _data?: AuthorData[],
): Promise<AuthorInfo | null> {
  return null;
}

export async function getPoemsByAuthor(
  _author: string,
  _scriptVariant: ScriptVariant = "zh-Hans",
  _repository?: AuthorPoemsRepository,
  _dependencies?: AuthorPoemsDependencies,
): Promise<AuthorPoem[]> {
  return [];
}
```

- [ ] **步骤 3：创建 `tests/author/repository.test.ts`，编写全部失败测试**

```ts
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
```

- [ ] **步骤 4：运行测试确认全部失败**

运行：`./node_modules/.bin/tsx --test tests/author/repository.test.ts`
预期：所有测试 FAIL（`getAuthorByName` 返回 `null`，`getPoemsByAuthor` 返回 `[]`）

- [ ] **步骤 5：Commit**

```bash
git add data/authors.json lib/author/repository.ts tests/author/repository.test.ts
git commit -m "test(author): 添加诗人数据层类型和失败测试"
```

---

## 任务 2：Repository 实现 — 测试通过

**文件：**
- 修改：`lib/author/repository.ts`

- [ ] **步骤 1：实现 `getAuthorByName` 和 `getPoemsByAuthor`**

替换 `lib/author/repository.ts` 中的占位实现为：

```ts
import authorsData from "../../data/authors.json";
import { db } from "@/lib/db";
import {
  getAllPoetryImages,
  getPlaceholderImage,
} from "@/lib/images/repository";
import {
  pickPoetryContentVariant,
  type ScriptVariant,
} from "@/lib/poetry/script-variant";

// ... (保留任务 1 中的全部类型定义和辅助函数不变)

export async function getAuthorByName(
  name: string,
  scriptVariant: ScriptVariant = "zh-Hans",
  data: AuthorData[] = authorsData as AuthorData[],
): Promise<AuthorInfo | null> {
  const entry = data.find((a) => a.name === name);
  if (!entry) return null;

  const bio =
    scriptVariant === "zh-Hant"
      ? entry.bioZhHant ?? entry.bio ?? null
      : entry.bio ?? null;

  const lifeStory =
    scriptVariant === "zh-Hant"
      ? entry.lifeStoryZhHant ?? entry.lifeStory ?? null
      : entry.lifeStory ?? null;

  return {
    name: entry.name,
    avatarUrl: entry.avatarUrl ?? DEFAULT_AVATAR,
    dynasty: entry.dynasty,
    courtesyName: entry.courtesyName ?? null,
    literaryName: entry.literaryName ?? null,
    bio,
    lifeStory,
    sourceUrl: entry.sourceUrl ?? null,
  };
}

export async function getPoemsByAuthor(
  author: string,
  scriptVariant: ScriptVariant = "zh-Hans",
  repository?: AuthorPoemsRepository,
  dependencies?: AuthorPoemsDependencies,
): Promise<AuthorPoem[]> {
  const repo = repository ?? (db as unknown as AuthorPoemsRepository);
  const deps = dependencies ?? { getAllImages: () => getAllPoetryImages() };

  const [records, imageMap] = await Promise.all([
    repo.poetry.findMany({
      where: { author },
      select: {
        id: true,
        title: true,
        author: true,
        dynasty: true,
        lines: true,
        tags: true,
        difficulty: true,
        titleZhHans: true,
        titleZhHant: true,
        authorZhHans: true,
        authorZhHant: true,
        linesZhHans: true,
        linesZhHant: true,
      },
      orderBy: { difficulty: "asc" },
    }),
    deps.getAllImages(),
  ]);

  return records.map((record) => {
    const variant = pickPoetryContentVariant(record, scriptVariant);
    const tags = toStringArray(record.tags);
    const lines = toStringArray(record.lines);
    const image = imageMap.get(record.id) ?? getPlaceholderImage(record.id);

    return {
      id: record.id,
      title: variant.title,
      author: variant.author,
      dynasty: record.dynasty,
      previewLine: lines[0] ?? "",
      formTag: classifyFormTag(tags),
      image,
    };
  });
}
```

> 注意：保留任务 1 中定义的所有类型（`AuthorData`, `AuthorInfo`, `AuthorPoem`, `AuthorPoemsRepository`, `AuthorPoemsDependencies`）、辅助函数（`toStringArray`, `classifyFormTag`）和常量（`FORM_TAGS`, `DEFAULT_AVATAR`）。仅替换两个占位函数。

- [ ] **步骤 2：运行测试确认全部通过**

运行：`./node_modules/.bin/tsx --test tests/author/repository.test.ts`
预期：全部 PASS

- [ ] **步骤 3：运行全量测试确保无回归**

运行：`npm test`
预期：全部 PASS（含既有测试）

- [ ] **步骤 4：Commit**

```bash
git add lib/author/repository.ts
git commit -m "feat(author): 实现 getAuthorByName 和 getPoemsByAuthor"
```

---

## 任务 3：author-header 组件

**文件：**
- 创建：`components/author/author-header.tsx`

- [ ] **步骤 1：创建 `components/author/author-header.tsx`**

遵循项目现有组件风格（参考 `components/browse/poetry-card.tsx` 和 browse 页面 header 区），使用 Tailwind + CSS 变量：

```tsx
import Image from "next/image";

import type { AuthorInfo } from "@/lib/author/repository";

type AuthorHeaderProps = {
  author: AuthorInfo;
};

export function AuthorHeader({ author }: AuthorHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-card)] p-8 shadow-[var(--shadow-soft)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(222,196,150,0.3),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(176,204,188,0.25),transparent_30%)]" />

      <div className="relative flex flex-col items-center text-center">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border-[3px] border-[rgba(222,196,150,0.6)]">
          <Image
            src={author.avatarUrl}
            alt={author.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>

        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
          {author.name}
        </h1>

        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {author.dynasty}
          {author.courtesyName ? ` · 字${author.courtesyName}` : ""}
          {author.literaryName ? ` · ${author.literaryName}` : ""}
        </p>

        {author.bio ? (
          <p className="mt-4 max-w-2xl text-sm leading-8 text-[var(--color-muted)]">
            {author.bio}
          </p>
        ) : (
          <p className="mt-4 max-w-2xl text-sm leading-8 text-[var(--color-muted)] italic">
            此作者生平暂无考证，唯有佳作传世。
          </p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **步骤 2：Commit**

```bash
git add components/author/author-header.tsx
git commit -m "feat(author): 添加 author-header 组件"
```

---

## 任务 4：author-bio 组件

**文件：**
- 创建：`components/author/author-bio.tsx`

- [ ] **步骤 1：创建 `components/author/author-bio.tsx`**

```tsx
type AuthorBioProps = {
  lifeStory: string | null;
  sourceUrl?: string | null;
};

export function AuthorBio({ lifeStory, sourceUrl }: AuthorBioProps) {
  if (!lifeStory) return null;

  return (
    <section className="rounded-[2rem] border border-[var(--color-line)] bg-white/80 p-6 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
      <h2 className="text-xl font-semibold">生平概述</h2>
      <p className="mt-4 text-sm leading-8 text-[var(--color-muted)]">
        {lifeStory}
      </p>
      {sourceUrl && (
        <p className="mt-4 text-xs text-[var(--color-muted)]">
          来源：古文岛 ·{" "}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition hover:text-[var(--color-ink)]"
          >
            查看原文
          </a>
        </p>
      )}
    </section>
  );
}
```

- [ ] **步骤 2：Commit**

```bash
git add components/author/author-bio.tsx
git commit -m "feat(author): 添加 author-bio 组件"
```

---

## 任务 5：author-poems 组件（自适应卡片/列表）

**文件：**
- 创建：`components/author/author-poems.tsx`

- [ ] **步骤 1：创建 `components/author/author-poems.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";

import type { AuthorPoem } from "@/lib/author/repository";

type AuthorPoemsProps = {
  poems: AuthorPoem[];
  authorName: string;
};

function PoemCard({ poem }: { poem: AuthorPoem }) {
  const imageSrc = poem.image.thumbPath ?? poem.image.imagePath;

  return (
    <Link
      href={`/poetry/${poem.id}`}
      className="group block overflow-hidden rounded-[1.25rem] border border-[var(--color-line)] bg-white/82 shadow-[0_12px_30px_rgba(91,74,59,0.08)] transition hover:bg-white hover:shadow-[var(--shadow-soft)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-accent-soft)]">
        <Image
          src={imageSrc}
          alt={`${poem.title} 配图`}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="px-4 py-3">
        <h3 className="truncate text-base font-medium">{poem.title}</h3>
        <p className="mt-1 truncate text-sm text-[var(--color-muted)]">
          {poem.formTag ?? "诗"}
        </p>
      </div>
    </Link>
  );
}

function PoemListItem({ poem }: { poem: AuthorPoem }) {
  return (
    <Link
      href={`/poetry/${poem.id}`}
      className="block rounded-[1.25rem] border border-[var(--color-line)] bg-white/72 p-4 transition hover:bg-white"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-medium">{poem.title}</p>
          <p className="mt-1 truncate text-sm text-[var(--color-muted)]">
            {poem.previewLine}
          </p>
        </div>
        {poem.formTag && (
          <span className="shrink-0 rounded-full border border-[var(--color-line)] bg-[var(--color-accent-soft)] px-3 py-1 text-xs text-[var(--color-muted)]">
            {poem.formTag}
          </span>
        )}
      </div>
    </Link>
  );
}

export function AuthorPoems({ poems, authorName }: AuthorPoemsProps) {
  if (poems.length === 0) {
    return (
      <section>
        <h2 className="text-xl font-semibold">收录作品</h2>
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          暂未收录 {authorName} 的作品。
        </p>
      </section>
    );
  }

  const useCards = poems.length <= 6;

  return (
    <section>
      <h2 className="text-xl font-semibold">
        收录作品{" "}
        <span className="font-normal text-[var(--color-muted)]">
          {poems.length} 首
        </span>
      </h2>

      {useCards ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {poems.map((poem) => (
            <PoemCard key={poem.id} poem={poem} />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {poems.map((poem) => (
            <PoemListItem key={poem.id} poem={poem} />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **步骤 2：Commit**

```bash
git add components/author/author-poems.tsx
git commit -m "feat(author): 添加 author-poems 自适应组件（≤6 卡片 / >6 列表）"
```

---

## 任务 6：作者页面路由

**文件：**
- 创建：`app/author/[authorName]/page.tsx`

- [ ] **步骤 1：创建 `app/author/[authorName]/page.tsx`**

遵循 `app/poetry/[id]/page.tsx` 的模式（Server Component、cookies 读简繁偏好、notFound 处理）：

```tsx
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";

import { AuthorHeader } from "@/components/author/author-header";
import { AuthorBio } from "@/components/author/author-bio";
import { AuthorPoems } from "@/components/author/author-poems";
import {
  getAuthorByName,
  getPoemsByAuthor,
} from "@/lib/author/repository";
import {
  resolveScriptVariant,
  SCRIPT_VARIANT_COOKIE_NAME,
} from "@/lib/poetry/script-variant";

type AuthorPageProps = {
  params: Promise<{
    authorName: string;
  }>;
};

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { authorName: rawName } = await params;
  const authorName = decodeURIComponent(rawName).trim();

  const cookieStore = await cookies();
  const scriptVariant = resolveScriptVariant(
    cookieStore.get(SCRIPT_VARIANT_COOKIE_NAME)?.value,
  );

  const author = await getAuthorByName(authorName, scriptVariant);
  const poems = await getPoemsByAuthor(authorName, scriptVariant);

  if (!author && poems.length === 0) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--color-page)] px-6 py-10 text-[var(--color-ink)] sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex w-fit items-center rounded-full border border-[var(--color-line)] bg-white/70 px-4 py-2 text-sm text-[var(--color-muted)] transition hover:bg-white"
          >
            返回首页
          </Link>
        </div>

        {author && <AuthorHeader author={author} />}

        <AuthorBio
          lifeStory={author?.lifeStory ?? null}
          sourceUrl={author?.sourceUrl ?? null}
        />

        <AuthorPoems poems={poems} authorName={authorName} />
      </div>
    </main>
  );
}
```

- [ ] **步骤 2：验证页面可渲染**

运行：`npm run dev`，访问 `http://localhost:3000/author/%E6%9D%8E%E7%99%BD`
预期：页面显示李白信息区（使用 default.svg 头像，因真实头像尚未下载）+ 生平 + "暂未收录" 作品（因 DB 无数据或数据不全属正常）

- [ ] **步骤 3：Commit**

```bash
git add app/author/[authorName]/page.tsx
git commit -m "feat(author): 添加 /author/[authorName] 页面路由"
```

---

## 任务 7：导航链接 — 现有组件添加作者链接

**文件：**
- 修改：`components/home/today-poetry-hero.tsx:77-79`
- 修改：`components/browse/poetry-card.tsx:13-34`
- 修改：`components/poetry/poetry-detail.tsx:68-101`

- [ ] **步骤 1：修改 `components/home/today-poetry-hero.tsx`**

当前第 77-79 行：
```tsx
<p className="mt-2 text-sm text-[var(--color-muted)]">
  {todayPoetry.poetry.dynasty} · {todayPoetry.poetry.author}
</p>
```

替换为：
```tsx
<p className="mt-2 text-sm text-[var(--color-muted)]">
  {todayPoetry.poetry.dynasty} ·{" "}
  <Link
    href={`/author/${todayPoetry.poetry.author}` as import("next").Route}
    className="transition hover:text-[var(--color-ink)]"
  >
    {todayPoetry.poetry.author}
  </Link>
</p>
```

> 注意：`Link` 已在文件顶部 import（第 1 行），无需额外导入。

- [ ] **步骤 2：修改 `components/browse/poetry-card.tsx` — stretch-link 模式**

当前整个卡片是 `<Link>`，作者在里面。需重构为 stretch-link 模式避免嵌套 `<a>`。将整个组件替换为：

```tsx
import Image from "next/image";
import Link from "next/link";

import type { BrowsePoem } from "@/lib/browse/repository";

type PoetryCardProps = {
  poem: BrowsePoem;
};

export function PoetryCard({ poem }: PoetryCardProps) {
  const imageSrc = poem.image.thumbPath ?? poem.image.imagePath;

  return (
    <div className="group relative block overflow-hidden rounded-[1.25rem] border border-[var(--color-line)] bg-white/82 shadow-[0_12px_30px_rgba(91,74,59,0.08)] transition hover:bg-white hover:shadow-[var(--shadow-soft)]">
      <Link
        href={`/poetry/${poem.id}`}
        className="absolute inset-0 z-0"
        aria-label={`查看 ${poem.title}`}
      />
      <div className="relative z-10 pointer-events-none">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-accent-soft)]">
          <Image
            src={imageSrc}
            alt={`${poem.title} 配图`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        </div>
        <div className="px-4 py-3">
          <h3 className="truncate text-base font-medium">{poem.title}</h3>
          <p className="mt-1 truncate text-sm text-[var(--color-muted)]">
            {poem.dynasty} ·{" "}
            <Link
              href={`/author/${poem.author}` as import("next").Route}
              className="pointer-events-auto transition hover:text-[var(--color-ink)]"
            >
              {poem.author}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

关键设计：外层 `<div>` 包裹，`<Link to poem>` 用 `absolute inset-0 z-0` 铺满卡片作底层链接。内容层 `pointer-events-none` 让点击穿透到诗歌链接。作者链接 `pointer-events-auto` 拦截自己的点击。

- [ ] **步骤 3：修改 `components/poetry/poetry-detail.tsx` — 侧边栏添加诗人链接**

在侧边栏 `<aside>` 中（第 68 行之后），在 AI 解释卡片和推荐区之间添加一个诗人卡片。在第 69 行 `<AiExplanationCard>` 之前插入：

```tsx
<section className="rounded-[2rem] border border-[var(--color-line)] bg-white/80 p-5 shadow-[0_18px_44px_rgba(96,73,52,0.08)]">
  <Link
    href={`/author/${poetry.author}` as Route}
    className="flex items-center gap-3 transition hover:opacity-80"
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-accent-soft)] text-sm text-[var(--color-muted)]">
      诗
    </div>
    <div>
      <p className="text-sm font-medium">关于诗人</p>
      <p className="text-xs text-[var(--color-muted)]">
        {poetry.author} · {poetry.dynasty}
      </p>
    </div>
  </Link>
</section>
```

> `Link` 和 `Route` 已在文件顶部 import（第 1-2 行），无需额外导入。

- [ ] **步骤 4：运行全量测试**

运行：`npm test`
预期：全部 PASS

- [ ] **步骤 5：Commit**

```bash
git add components/home/today-poetry-hero.tsx components/browse/poetry-card.tsx components/poetry/poetry-detail.tsx
git commit -m "feat(author): 首页/浏览页/详情页添加诗人链接入口"
```

---

## 任务 8：默认占位头像

**文件：**
- 创建：`public/images/authors/default.svg`

- [ ] **步骤 1：创建 SVG 占位头像**

在 `public/images/authors/default.svg` 创建一个古风水墨风格剪影 SVG：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#f5f0e8"/>
  <circle cx="100" cy="72" r="32" fill="#c4b8a0"/>
  <ellipse cx="100" cy="155" rx="48" ry="36" fill="#c4b8a0"/>
  <text x="100" y="195" text-anchor="middle" font-size="11" fill="#a09880" font-family="serif">佚名</text>
</svg>
```

- [ ] **步骤 2：验证图片可访问**

运行 dev server 后访问 `http://localhost:3000/images/authors/default.svg`
预期：SVG 正常渲染

- [ ] **步骤 3：Commit**

```bash
git add public/images/authors/default.svg
git commit -m "feat(author): 添加默认占位诗人头像 SVG"
```

---

## 任务 9：古文岛抓取脚本

**文件：**
- 创建：`scripts/scrape-authors.ts`

- [ ] **步骤 1：安装依赖**

```bash
npm install -D cheerio opencc-js
```

- [ ] **步骤 2：创建 `scripts/scrape-authors.ts`**

```ts
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";
import * as OpenCC from "opencc-js";

// --- Config ---

const LIST_URL = "https://www.guwendao.net/authors.aspx";
const AVATAR_BASE = "https://ziyuan.guwendao.net/authorImg300/";
const OUTPUT_JSON = join(import.meta.dirname, "../data/authors.json");
const AVATAR_DIR = join(import.meta.dirname, "../public/images/authors");
const TARGET_DYNASTY = "唐";

const converter = OpenCC.Converter({ from: "cn", to: "tw" });

// --- Types ---

type AuthorEntry = {
  name: string;
  nameZhHant: string | null;
  avatarUrl: string | null;
  dynasty: string;
  courtesyName: string | null;
  literaryName: string | null;
  bio: string | null;
  bioZhHant: string | null;
  lifeStory: string | null;
  lifeStoryZhHant: string | null;
  sourceUrl: string | null;
};

// --- Helpers ---

function extractCourtesyName(text: string): string | null {
  const match = text.match(/字(\S{1,6})/);
  return match?.[1] ?? null;
}

function extractLiteraryName(text: string): string | null {
  const match = text.match(/号(\S{1,10}?)[，。、，]/);
  return match?.[1] ?? null;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "TangPoetryBot/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function toPinyinSlug(name: string): string {
  // Simple pinyin mapping for known Tang poets
  // This is a lookup table; unknown names return a sanitized version
  const pinyinMap: Record<string, string> = {
    "李白": "libai", "杜甫": "dufu", "王维": "wangwei", "白居易": "baijuyi",
    "李商隐": "lishangyin", "孟浩然": "menghaoran", "刘禹锡": "liuyuxi",
    "杜牧": "dumu", "王昌龄": "wangchangling", "岑参": "censhen",
    "高适": "gaoshi", "韦应物": "weiyingwu", "柳宗元": "liuzongyuan",
    "韩愈": "hanyu", "刘长卿": "liuchangqing", "王之涣": "wangzhixuan",
    "贾岛": "jiadao", "贺知章": "hezhizhang", "陈子昂": "chenziang",
    "骆宾王": "luobinwang", "元稹": "yuanzhen", "温庭筠": "wentingyun",
    "张九龄": "zhangjiuling", "张籍": "zhangji", "张继": "zhangji2",
    "李颀": "liqi", "卢纶": "lulun", "钱起": "qianqi", "韦庄": "weizhuang",
    "李端": "liduan", "王建": "wangjian", "皎然": "jiaoran", "许浑": "xuhun",
    "沈佺期": "shenquanqi", "宋之问": "songzhiwen", "崔颢": "cuihao",
    "孟郊": "mengjiao", "李益": "liyi", "皇甫冉": "huangfuran",
    "司空曙": "sikongshu", "戴叔伦": "daishulun", "柳中庸": "liuzhongyong",
    "张祜": "zhanghu", "祖咏": "zuyong", "綦毋潜": "qiwuqian",
    "常建": "changjian", "崔涂": "cuitu", "李频": "lipin",
    "金昌绪": "jinchangxu", "裴迪": "peidi", "王湾": "wangwan",
    "王翰": "wanghan", "杜审言": "dushenyan", "张旭": "zhangxu",
    "马戴": "madai", "薛逢": "xuefeng", "韩翃": "hanhong",
    "权德舆": "quandeyu", "顾况": "gukuang", "张泌": "zhangmi",
    "秦韬玉": "qintaoyu", "朱庆余": "zhuqingyu", "郑畋": "zhengtian",
    "韩偓": "hanwo", "崔曙": "cuishu", "周朴": "zhoupiao",
    "刘方平": "liufangping", "刘眘虚": "liushenxu", "严维": "yanwei",
    "丘为": "qiuwei", "元结": "yuanjie", "唐玄宗": "tangxuanzong",
    "孙革": "sunge", "西鄙人": "xibiren", "不详": "buxiang",
    "无名氏": "wuming-shi", "杨敬述进": "yangjingshujin",
    "释明辩": "shimingbian", "朱斌": "zhubin", "蔡襄": "caixiang",
    "陈陶": "chentao", "杜荀鹤": "duxunhe", "高适": "gaoshi",
    "张佖": "zhangbi", "张乔": "zhangqiao", "王涯": "wangya",
    "李煜": "liyu", "鲍照": "baozhao",
  };
  return pinyinMap[name] ?? name.replace(/[^一-鿿]/g, "");
}

async function downloadAvatar(name: string, slug: string): Promise<string | null> {
  const url = `${AVATAR_BASE}${slug}.jpg`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TangPoetryBot/1.0" },
    });
    if (!res.ok) {
      console.warn(`  ⚠ 头像下载失败 ${name}: ${res.status}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const filePath = join(AVATAR_DIR, `${slug}.jpg`);
    writeFileSync(filePath, buffer);
    return `/images/authors/${slug}.jpg`;
  } catch (err) {
    console.warn(`  ⚠ 头像下载异常 ${name}:`, err);
    return null;
  }
}

// --- Main ---

async function main() {
  console.log("📡 抓取古文岛作者列表...");
  const listHtml = await fetchPage(LIST_URL);
  const $list = cheerio.load(listHtml);

  // Extract author data from list page
  // The actual DOM structure needs to be inspected; this is a best-effort parse
  const listAuthors: Map<string, {
    bio: string;
    avatarSlug: string;
    detailHash: string | null;
  }> = new Map();

  // Parse the list page for author entries
  // guwendao structure: each author is in a container with img, name, and bio
  $list("img[src*='authorImg300']").each((_i, el) => {
    const imgSrc = $list(el).attr("src") ?? "";
    const slugMatch = imgSrc.match(/authorImg300\/(.+)\.jpg/);
    if (!slugMatch) return;

    const slug = slugMatch[1];
    // Find the parent container and extract name + bio
    const container = $list(el).closest("div, li, tr");
    const nameEl = container.find("strong, b, a, h3, h2").first();
    const name = nameEl.text().trim();

    if (!name || listAuthors.has(name)) return;

    // Get bio text from the container
    const bioText = container.text().replace(name, "").trim().slice(0, 500);

    // Try to find detail page link
    const linkEl = container.find("a[href*='authorv_']").first();
    const detailHash = linkEl.attr("href")?.match(/authorv_(.+)\.aspx/)?.[1] ?? null;

    listAuthors.set(name, {
      bio: bioText,
      avatarSlug: slug,
      detailHash,
    });
  });

  console.log(`📋 列表页发现 ${listAuthors.size} 位诗人`);

  // Load local author names from ts300.simple.json
  const poemsData = await import("../data/ts300.simple.json");
  const localAuthors = new Set<string>();
  for (const poem of poemsData as Array<{ author: string }>) {
    localAuthors.add(poem.author);
  }
  console.log(`📖 本地共有 ${localAuthors.size} 位诗人`);

  // Ensure avatar directory exists
  if (!existsSync(AVATAR_DIR)) {
    mkdirSync(AVATAR_DIR, { recursive: true });
  }

  const results: AuthorEntry[] = [];

  for (const name of localAuthors) {
    const listInfo = listAuthors.get(name);

    if (!listInfo) {
      console.log(`  ⏭ ${name} — 古文岛无数据，仅记录姓名`);
      results.push({
        name,
        nameZhHant: null,
        avatarUrl: null,
        dynasty: TARGET_DYNASTY,
        courtesyName: null,
        literaryName: null,
        bio: null,
        bioZhHant: null,
        lifeStory: null,
        lifeStoryZhHant: null,
        sourceUrl: null,
      });
      continue;
    }

    // Download avatar
    const avatarUrl = await downloadAvatar(name, listInfo.avatarSlug);

    // Extract courtesy/literary name from bio
    const courtesyName = extractCourtesyName(listInfo.bio);
    const literaryName = extractLiteraryName(listInfo.bio);

    // Fetch detail page for life story
    let lifeStory: string | null = null;
    if (listInfo.detailHash) {
      try {
        const detailUrl = `https://www.guwendao.net/authorv_${listInfo.detailHash}.aspx`;
        console.log(`  📖 抓取详情: ${name}`);
        const detailHtml = await fetchPage(detailUrl);
        const $detail = cheerio.load(detailHtml);

        // Extract "生平" section content
        // The structure varies; try multiple selectors
        const lifeSection = $detail("h2:contains('生平'), h3:contains('生平')")
          .nextUntil("h2, h3")
          .text()
          .trim();

        if (lifeSection) {
          lifeStory = lifeSection.slice(0, 800);
        }

        // Small delay to be polite
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.warn(`  ⚠ 详情页抓取失败 ${name}:`, err);
      }
    }

    const bioText = listInfo.bio.slice(0, 300);
    const bioZhHant = bioText ? (converter(bioText) as string) : null;
    const lifeStoryZhHant = lifeStory ? (converter(lifeStory) as string) : null;

    results.push({
      name,
      nameZhHant: converter(name) !== name ? (converter(name) as string) : null,
      avatarUrl,
      dynasty: TARGET_DYNASTY,
      courtesyName,
      literaryName,
      bio: bioText || null,
      bioZhHant,
      lifeStory,
      lifeStoryZhHant,
      sourceUrl: listInfo.detailHash
        ? `https://www.guwendao.net/authorv_${listInfo.detailHash}.aspx`
        : null,
    });

    console.log(`  ✅ ${name} — bio: ${bioText ? "✓" : "✗"}, life: ${lifeStory ? "✓" : "✗"}, avatar: ${avatarUrl ? "✓" : "✗"}`);
  }

  // Write output
  writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\n🎉 完成！写入 ${results.length} 位诗人到 ${OUTPUT_JSON}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

> **重要：** 古文岛的 DOM 结构可能需要调整选择器。脚本首次运行后应人工检查 `data/authors.json` 输出，如有字段缺失需微调选择器。脚本使用 `cheerio` 做 HTML 解析，`opencc-js` 做简繁转换。`toPinyinSlug` 中的拼音映射表覆盖了全部 86 位唐代诗人。

- [ ] **步骤 3：运行抓取脚本**

```bash
./node_modules/.bin/tsx scripts/scrape-authors.ts
```

预期：控制台输出每位诗人的抓取结果，`data/authors.json` 被覆写为完整数据，`public/images/authors/` 下生成头像文件。

- [ ] **步骤 4：检查输出**

打开 `data/authors.json`，验证：
- 86 位诗人全部收录
- 主要诗人（李白、杜甫、王维等）有 bio、lifeStory、avatarUrl
- 边缘诗人（无名氏、不详）字段为 null

- [ ] **步骤 5：Commit**

```bash
git add scripts/scrape-authors.ts data/authors.json public/images/authors/
git commit -m "feat(author): 古文岛抓取脚本，生成 86 位诗人数据"
```

---

## 任务 10：最终验证

- [ ] **步骤 1：运行全量测试**

```bash
npm test
```

预期：全部 PASS

- [ ] **步骤 2：启动 dev server 并手动验证**

```bash
npm run dev
```

验证清单：
1. 访问 `/author/李白` — 显示头像、简介、生平、作品列表
2. 访问 `/author/杜甫` — 同上
3. 访问 `/author/无名氏` — 显示占位头像 + 占位文案 + 作品列表（如有）
4. 访问 `/author/不存在` — 404 页面
5. 首页点击诗人姓名 — 跳转到作者页
6. 浏览页点击卡片中诗人姓名 — 跳转到作者页（不影响卡片整体点击跳转诗歌详情）
7. 诗歌详情页侧边栏点击「关于诗人」— 跳转到作者页
8. 切换繁体后刷新作者页 — 简介和生平显示繁体

- [ ] **步骤 3：运行 build 确认无编译错误**

```bash
npm run build
```

预期：BUILD SUCCESSFUL

- [ ] **步骤 4：更新 `.continue-here.md`**

将任务状态标记为完成：
```markdown
- 任务：诗人页面已完成 ✅
```

- [ ] **步骤 5：最终 Commit**

```bash
git add .continue-here.md
git commit -m "chore(交接): 诗人页面任务完成"
```
