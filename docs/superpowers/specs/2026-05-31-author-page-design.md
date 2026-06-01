# 诗人详情页设计规格

日期：2026-05-31

## 概述

新增诗人详情页 `/author/[authorName]`，采用沉浸阅读型布局：上方诗人信息（头像、简介、生平概述）+ 下方作品画廊（自适应混合展示）。诗人数据从古文岛（guwendao.net）预抓取为静态 JSON，作品列表从 Prisma 查询。

## 用户体验

### 页面结构（从上到下）

1. **返回导航** — 左侧「返回首页」按钮，右侧简繁切换（如有）
2. **诗人信息区** — 居中布局，含：
   - 圆形头像（本地 `public/images/authors/` 目录）
   - 姓名（大标题）
   - 朝代 · 字号（副标题）
   - 简介段落（~200 字，支持简繁）
3. **生平概述** — 一段合并精简的叙述文字（~300-500 字，支持简繁）+ 来源链接
4. **作品列表** — 显示该诗人在本站收录的全部作品：
   - ≤6 首：配图卡片网格
   - \>6 首：列表模式（诗名 + 首句预览 + 体裁标签）
   - 按难度（difficulty）升序排列

### 降级策略

- 若 `authors.json` 中无该诗人详细数据（如"不详"、"无名氏"），保留诗人信息区骨架，使用：
  - 默认占位头像（古风水墨风格通用剪影，位于 `public/images/authors/default.jpg`）
  - 姓名正常显示（如"无名氏"）
  - 副标题留白
  - 简介处显示优雅占位文案："此作者生平暂无考证，唯有佳作传世。"
- 若 URL 中的 `authorName` 在 Poetry 表中无匹配，返回 404

### 简繁切换

简繁切换覆盖范围：诗人姓名、简介、生平概述、作品标题和首句预览。UI 标签、导航按钮不切换。

简介和生平的繁体文本在抓取阶段预生成（`bioZhHant`、`lifeStoryZhHant`），不做运行时 OpenCC 转换，保持零运行时开销。

## 数据架构

### 方案：静态 JSON 文件（方案 A）

`data/authors.json` 存储所有诗人信息，运行时由 Server Component 直接读取。不新增 Prisma 模型。

**理由：**
- 86 位诗人数据量极小（~200KB），静态 JSON 完全够用
- 与现有 `data/ts300.simple.json` 模式一致
- 零 schema 变更，无迁移风险
- Phase 1 简单优先，YAGNI

### JSON 结构

```jsonc
[
  {
    "name": "李白",                          // 中文姓名，关联键（匹配 Poetry.author）
    "nameZhHant": "李白",                    // 繁体姓名
    "avatarUrl": "/images/authors/libai.jpg", // 本地路径（抓取时下载到 public/images/authors/）
    "dynasty": "唐",
    "courtesyName": "太白",                  // 字，从简介文本正则提取，提取不到为 null
    "literaryName": "青莲居士",              // 号，从简介文本正则提取，提取不到为 null
    "bio": "李白（701年—762年），字太白...",  // 简介简体，~200字
    "bioZhHant": "李白（701年—762年），字太白...", // 简介繁体，抓取时由 OpenCC 生成
    "lifeStory": "李白少年即显露才华...",     // 生平简体，~300-500字
    "lifeStoryZhHant": "李白少年即顯露才華...", // 生平繁体，抓取时由 OpenCC 生成
    "sourceUrl": "https://www.guwendao.net/authorv_b90660e3e492.aspx"
  }
  // ... 共 86 位诗人。未从古文岛匹配到的诗人只保留 name + dynasty，其余字段为 null
]
```

### 抓取脚本

`scripts/scrape-authors.ts`：
1. 请求古文岛列表页 `authors.aspx`，按唐代过滤，提取姓名、简介、头像 URL、详情页 hash
2. 逐一请求详情页，提取「生平」段落，合并精简为一段
3. **下载头像**到 `public/images/authors/{pinyin}.jpg`，avatarUrl 写为本地相对路径
4. 使用 OpenCC 将简介和生平行文转为繁体，生成 `bioZhHant` 和 `lifeStoryZhHant` 字段
5. 与本地 86 位诗人名单（从 `data/ts300.simple.json` 的 author 字段提取）交叉匹配
6. 输出 `data/authors.json`
7. 未匹配到的诗人保留 `name` + `dynasty`，其余字段为 `null`

## 路由

- **URL 格式：** `/author/[authorName]`，authorName 为中文姓名
- **示例：** `/author/李白`、`/author/杜甫`
- **参数解析：** 页面组件中显式调用 `decodeURIComponent(authorName).trim()`，防御编码异常和空白字符

## 导航入口

| 入口位置 | 触发方式 | 说明 |
|---|---|---|
| 诗歌详情页 `/poetry/[id]` | 点击诗人姓名 | 最自然的入口 |
| 浏览页 `/browse` | 点击分类卡片上的诗人姓名 | |
| 今日诗歌 `/` | 点击诗人姓名 | |
| 挑战页 `/challenge` | 暂不添加 | 避免干扰答题流程 |

实现方式：将现有组件中显示诗人姓名的 `<span>` 改为 `<Link href={/author/${author}}>`。

## 文件清单

### 新增文件

| 文件 | 职责 |
|---|---|
| `app/author/[authorName]/page.tsx` | 诗人详情页 Server Component |
| `lib/author/repository.ts` | 数据获取：读 authors.json + Prisma 查作品 |
| `public/images/authors/default.jpg` | 默认占位头像（古风水墨剪影） |
| `components/author/author-header.tsx` | 头像 + 姓名 + 朝代 + 简介 |
| `components/author/author-bio.tsx` | 生平概述文字 |
| `components/author/author-poems.tsx` | 作品列表（卡片/列表自适应） |
| `scripts/scrape-authors.ts` | 古文岛抓取脚本 |
| `data/authors.json` | 抓取输出 |
| `tests/author/repository.test.ts` | 数据层单元测试 |

### 修改文件

| 文件 | 改动 |
|---|---|
| `components/poetry/poetry-detail.tsx` | 诗人姓名 → Link |
| `components/home/` 中的首页组件 | 诗人姓名 → Link |
| `components/browse/category-section.tsx` | 诗人姓名 → Link |

### 组件属性

全部 Server Component，无客户端交互。

| 组件 | Props |
|---|---|
| `page.tsx` | `{ params: { authorName: string } }` |
| `author-header` | `{ author: AuthorInfo }` |
| `author-bio` | `{ bio: string, lifeStory: string, sourceUrl?: string }` |
| `author-poems` | `{ poems: AuthorPoem[], displayMode: "cards" \| "list" }` |

### 数据层（`lib/author/repository.ts`）

- `getAuthorByName(name: string, scriptVariant?: ScriptVariant): AuthorInfo | null` — 读 `authors.json`，按 name 查找，根据 scriptVariant 返回对应简繁内容（bio/bioZhHant, lifeStory/lifeStoryZhHant）
- `getPoemsByAuthor(author: string, scriptVariant: ScriptVariant): Promise<AuthorPoem[]>` — Prisma 查 Poetry 表，按 author 筛选，含配图、首句预览、体裁标签，按 difficulty 升序

## 测试

- `tests/author/repository.test.ts`：测试 `getAuthorByName` 和 `getPoemsByAuthor`，使用 mock repository
- 遵循项目 TDD 规则：先写测试，再实现

## 范围外（Phase 2+）

- 诗人搜索
- 诗人关系图谱
- Prisma Author 模型
- 诗人头像本地上传
