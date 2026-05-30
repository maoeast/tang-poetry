# 唐诗画境一期实现计划

> **面向 AI 代理的工作指引：** 推荐使用 `subagent-driven-development` 或等价的任务分治方式执行此计划。步骤使用复选框跟踪进度。代码托管目标为 GitHub，文档中的文件路径一律使用相对路径。

**目标：** 从当前 skill 资源与参考数据出发，搭建一个具备完整前后端、统一数据、基础学习闭环和首批视觉资产的唐诗学习应用。

**架构：** 使用 Next.js 全栈单仓结构，前端负责页面与交互，服务端负责数据导入、学习记录、复习调度、图片资产查询与 DeepSeek 代理。图片在文件系统中保存，在数据库中登记为运行时唯一数据源。

**技术栈：** Next.js、React、TypeScript、Tailwind CSS、Prisma、PostgreSQL 16、Node.js 22、opencc-js

---

## 文件结构

计划中的主要目录与职责如下：

- 创建：`app/`  
  Next.js App Router 页面目录。
- 创建：`components/`  
  可复用 UI 组件。
- 创建：`lib/`  
  数据处理、判题、AI 代理、访问保护、主题配置等业务模块。
- 创建：`prisma/schema.prisma`  
  数据库模型定义。
- 创建：`scripts/import-ts300.ts`  
  导入并清洗 `唐诗三百首.json`，同时生成未来一年 `DailyPoetry` 排期。
- 创建：`scripts/import-image-assets.ts`  
  将 `data/image-assets.json` 批量写入 `ImageAsset` 表。
- 创建：`data/poetries.normalized.json`  
  清洗后的统一主数据。
- 创建：`data/image-assets.json`  
  图片资产批量导入中间产物，不参与运行时读取。
- 创建：`public/images/poetry/`  
  诗歌主图与缩略图目录。
- 创建：`public/images/placeholders/`  
  占位图资源。
- 创建：`docs/superpowers/assets/poetry-image-prompts.md`  
  图像生产规范与 prompt 模板。
- 创建：`tests/` 或对应测试目录  
  规则模块与接口测试。

---

## 任务 1：初始化全栈项目骨架

**文件：**

- 创建：`package.json`
- 创建：`next.config.js`
- 创建：`tsconfig.json`
- 创建：`tailwind.config.ts`
- 创建：`postcss.config.js`
- 创建：`app/layout.tsx`
- 创建：`app/page.tsx`
- 创建：`app/globals.css`
- 创建：`middleware.ts`
- 创建：`app/unlock/page.tsx`
- 创建：`.gitattributes`
- 创建：`.nvmrc`
- 创建：`docker-compose.yml`
- 创建：`README.md`

- [ ] **步骤 1：初始化 Next.js + TypeScript + Tailwind 基础结构**

运行：

```powershell
npx create-next-app@latest . --ts --tailwind --eslint --app --use-npm --yes
```

预期：生成可运行的 App Router 项目骨架。

- [ ] **步骤 2：确认默认页面可启动**

运行：

```powershell
npm run dev
```

预期：本地开发服务器可启动，并能打开默认首页。

- [ ] **步骤 3：整理默认文件，保留最小骨架**

需要调整：

- 将默认首页改为项目占位首页。
- 在 `app/globals.css` 中建立设计变量。
- 为后续主题切换预留 CSS 变量命名。

- [ ] **步骤 4：补齐工程基础文件**

创建：

- `.gitattributes`

```gitattributes
* text=auto eol=lf
```

- `.nvmrc`

```text
22
```

- `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16
    container_name: tang-poetry-postgres
    environment:
      POSTGRES_DB: tang_poetry
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

- [ ] **步骤 5：记录运行方式**

在 `README.md` 中写明：

- 安装依赖
- 启动 PostgreSQL 的命令 `docker compose up -d`
- 启动应用方式
- 环境变量位置

- [ ] **步骤 6：建立一期访问保护入口**

实现：

- `middleware.ts` 读取 `APP_PASSWORD` 校验 cookie
- `app/unlock/page.tsx` 提供口令输入入口

预期：未通过验证时访问核心页面会跳转到 `/unlock`。

---

## 任务 2：建立数据库与后端基础模型

**文件：**

- 创建：`prisma/schema.prisma`
- 创建：`lib/db.ts`
- 创建：`.env.example`

- [ ] **步骤 1：定义 Prisma 模型**

在 `schema.prisma` 中创建：

- `Poetry`
- `ImageAsset`
- `DailyPoetry`
- `LearningRecord`
- `ChallengeAttempt`
- `ReviewState`
- `Favorite`

不要创建 `User` 模型。一期采用单用户实现，所有记录固定使用 `SYSTEM_USER_ID`，但保留 `userId` 字段，为未来多用户扩展预留。

核心字段示例：

```prisma
model Poetry {
  id             String   @id
  sourceId       Int?
  title          String
  titleOriginal  String?
  author         String
  authorOriginal String?
  dynasty        String
  lines          Json
  tags           Json
  themes         Json
  difficulty     Int      @default(1)
  imageKey       String?
  imageStatus    String   @default("placeholder")
  translation    String?
  pinyin         Json?
  aiExplanation  Json?
}

model DailyPoetry {
  date     String @id
  poetryId String
}
```

- [ ] **步骤 2：配置 PostgreSQL 开发环境**

运行：

```powershell
docker compose up -d
```

预期：本地 PostgreSQL 16 正常启动，并监听 `5432` 端口。

- [ ] **步骤 3：生成数据库迁移**

运行：

```powershell
npx prisma migrate dev --name init
```

预期：创建 PostgreSQL 初始迁移文件并完成本地数据库建表。

- [ ] **步骤 4：封装数据库客户端**

在 `lib/db.ts` 中创建单例 Prisma Client。

示例：

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **步骤 5：补齐完整环境变量模板**

在 `.env.example` 中定义：

```env
# 数据库连接
DATABASE_URL="postgresql://dev:devpassword@localhost:5432/tang_poetry"

# DeepSeek AI 接口
DEEPSEEK_API_KEY=""
DEEPSEEK_BASE_URL="https://api.deepseek.com"

# 应用访问
APP_URL="http://你的公网IP"
APP_PASSWORD="设置一个访问密码"

# 固定用户 ID（一期单用户实现，替代用户系统）
SYSTEM_USER_ID="family-001"
```

---

## 任务 3：导入并清洗唐诗三百首数据

**文件：**

- 创建：`scripts/import-ts300.ts`
- 创建：`lib/poetry/normalize.ts`
- 创建：`lib/poetry/daily-seed.ts`
- 创建：`data/poetries.normalized.json`
- 修改：`references/`
- 创建：`tests/poetry/normalize.test.ts`

- [ ] **步骤 1：编写清洗规则模块**

在 `lib/poetry/normalize.ts` 中定义：

- 使用 `opencc-js` 做繁简转换
- `paragraphs -> lines` 映射
- 内部 `id` 生成规则
- 默认 `dynasty`、`difficulty`、`imageStatus`

建议接口：

```ts
export type RawTs300Poem = {
  id: number;
  title: string;
  author: string;
  paragraphs: string[];
  tags?: string[];
};

export type NormalizedPoem = {
  id: string;
  sourceId: number;
  title: string;
  titleOriginal: string;
  author: string;
  authorOriginal: string;
  dynasty: "唐";
  lines: string[];
  tags: string[];
  themes: string[];
  difficulty: number;
  imageKey: string;
  imageStatus: "placeholder" | "ready";
};
```

- [ ] **步骤 2：为清洗函数编写测试**

至少覆盖：

- 标题与作者字段保留原文
- 简体展示字段转换正确
- 统一结构输出
- 行数组长度正确
- 图像键生成稳定

- [ ] **步骤 3：运行测试并确认失败**

运行：

```powershell
npm test -- normalize
```

预期：在实现前测试失败，提示相关函数未定义或结果不匹配。

- [ ] **步骤 4：实现最小清洗逻辑并重新运行测试**

运行：

```powershell
npm test -- normalize
```

预期：测试通过。

- [ ] **步骤 5：编写每日排期生成逻辑**

在 `lib/poetry/daily-seed.ts` 中实现未来一年排期生成。

要求：

- 输出未来 365 天映射
- 写入 `DailyPoetry`
- 允许后续按节气、节日手工调整

- [ ] **步骤 6：编写导入脚本**

脚本职责：

- 下载或读取 `唐诗三百首.json`
- 调用清洗模块
- 输出 `data/poetries.normalized.json`
- 将诗歌写入数据库
- 生成未来一年 `DailyPoetry` 并写入数据库

运行：

```powershell
npx tsx scripts/import-ts300.ts
```

预期：数据库中写入全部诗歌记录，并生成统一 JSON 文件与每日排期。

---

## 任务 4：建立图片资产规范与导入链路

**文件：**

- 创建：`docs/superpowers/assets/poetry-image-prompts.md`
- 创建：`data/image-assets.json`
- 创建：`scripts/import-image-assets.ts`
- 创建：`lib/images/repository.ts`
- 创建：`public/images/placeholders/default-poetry-card.jpg`

- [ ] **步骤 1：沉淀儿童绘本水彩 prompt 模板**

在文档中固定：

- 风格关键词
- 构图要求
- 留白要求
- 禁止项
- 分类色板

至少包含：

- 通用 prompt
- 春景模板
- 夜景模板
- 山水模板
- 边塞模板
- 思乡模板

- [ ] **步骤 2：定义图片导入中间产物结构**

`data/image-assets.json` 仅用于批量导入，示例：

```json
[
  {
    "poetryId": "ts300-0001",
    "style": "storybook-watercolor",
    "status": "placeholder",
    "imagePath": "/images/placeholders/default-poetry-card.jpg",
    "thumbPath": "/images/placeholders/default-poetry-card.jpg",
    "promptVersion": "v1"
  }
]
```

- [ ] **步骤 3：编写图片导入脚本**

在 `scripts/import-image-assets.ts` 中实现：

- 读取 `data/image-assets.json`
- 写入 `ImageAsset` 表
- 已存在记录时按 `poetryId + style + promptVersion` 更新

- [ ] **步骤 4：封装运行时图片查询函数**

在 `lib/images/repository.ts` 中实现：

```ts
export async function getPoetryImage(poetryId: string) {
  // 只查询数据库中的 ImageAsset
  // 优先返回 status = "ready" 的记录
  // 缺失时回退到默认占位图
}
```

- [ ] **步骤 5：首批 30 到 50 首高频诗建立 ready 索引占位**

先建立数据库导入记录，不强行要求此刻全部图片都生成完成。需要支持后续持续替换路径。

---

## 任务 5：实现全局主题与布局系统

**文件：**

- 修改：`app/globals.css`
- 创建：`components/layout/app-shell.tsx`
- 创建：`components/layout/bottom-nav.tsx`
- 创建：`components/ui/page-hero.tsx`

- [ ] **步骤 1：定义一期主题变量**

在 `app/globals.css` 中加入：

```css
:root {
  --paper: #f7f0e3;
  --ink: #2b2119;
  --mist-blue: #c9d8ea;
  --spring-green: #cfdcb8;
  --sun-warm: #ecd8ad;
  --card: rgba(255, 250, 240, 0.78);
}
```

- [ ] **步骤 2：构建统一页面外壳**

外壳应负责：

- 顶部留白
- 底部导航
- 移动端优先宽度
- 页面背景渐变或纹理

- [ ] **步骤 3：构建复用的 Hero 组件**

用途：

- 首页主图
- 详情页头图
- 挑战页封面卡

---

## 任务 6：实现今日一诗页面

**文件：**

- 修改：`app/page.tsx`
- 创建：`lib/poetry/daily.ts`
- 创建：`components/poetry/daily-card.tsx`
- 创建：`tests/poetry/daily.test.ts`

- [ ] **步骤 1：定义今日诗查询逻辑**

改为从 `DailyPoetry` 表查询，而不是日期哈希。

示例：

```ts
export async function getDailyPoetry(date: string) {
  // 查询 DailyPoetry -> Poetry -> ImageAsset
}
```

- [ ] **步骤 2：为每日查询编写测试**

测试覆盖：

- 指定日期能命中已排期诗歌
- 缺失排期时返回可识别错误或空值
- 正常联查主图和占位图回退

- [ ] **步骤 3：首页渲染今日诗卡**

首页应展示：

- 场景图
- 诗名、作者
- 主推句
- 简短说明
- “阅读全文”与“开始挑战”

- [ ] **步骤 4：若图片缺失则回退占位图**

确保首页在图像尚未全量到位时仍可正常使用。

---

## 任务 7：实现诗歌详情页

**文件：**

- 创建：`app/poetry/[id]/page.tsx`
- 创建：`lib/poetry/repository.ts`
- 创建：`components/poetry/poetry-detail.tsx`

- [ ] **步骤 1：实现按 ID 查询诗歌数据**

在仓储模块中提供：

```ts
export async function getPoetryById(id: string) {}
export async function getRelatedPoetries(id: string) {}
```

- [ ] **步骤 2：详情页展示正文与基础信息**

应包含：

- 标题
- 作者
- 朝代
- 全文
- 译文占位
- 拼音开关占位

- [ ] **步骤 3：接入图片与相关推荐**

相关推荐一期可采用：

- 同作者优先
- 同主题优先

- [ ] **步骤 4：写入学习记录**

用户打开详情页时，使用 `SYSTEM_USER_ID` 记录一次 `view_poetry` 事件。

---

## 任务 8：实现挑战系统基础闭环

**文件：**

- 创建：`app/challenge/page.tsx`
- 创建：`lib/challenge/engine.ts`
- 创建：`lib/challenge/judge.ts`
- 创建：`components/challenge/challenge-runner.tsx`
- 创建：`tests/challenge/judge.test.ts`

- [ ] **步骤 1：实现对句判题规则**

判题清洗示例：

```ts
export function normalizeAnswer(text: string) {
  return text.replace(/[，。！？；：、\s]/g, "").trim();
}

export function judgeCouplet(userAnswer: string, expected: string) {
  return normalizeAnswer(userAnswer) === normalizeAnswer(expected);
}
```

- [ ] **步骤 2：先写测试，再实现逻辑**

覆盖：

- 忽略标点
- 忽略空格
- 错误答案返回 false

- [ ] **步骤 3：实现出题引擎**

一期题型：

- `couplet`
- `author`
- `title`
- `ordering`

`ordering` 题型要求：

- 随机排列后若与原始顺序一致，必须重新随机
- 测试中需显式覆盖这一规则

- [ ] **步骤 4：渲染挑战流程**

支持：

- 开始一轮挑战
- 逐题作答
- 即时反馈
- 最终结果页

- [ ] **步骤 5：记录挑战结果**

每次作答写入 `ChallengeAttempt`，同时更新 `LearningRecord`。一期固定写入 `SYSTEM_USER_ID`。

---

## 任务 9：实现复习池与熟练度规则

**文件：**

- 创建：`app/review/page.tsx`
- 创建：`lib/review/scheduler.ts`
- 创建：`components/review/review-list.tsx`
- 创建：`tests/review/scheduler.test.ts`

- [ ] **步骤 1：定义固定复习调度规则**

一期使用固定参数，不留模糊描述：

- 首次学习后加入复习池，`nextReviewAt = 当天 + 1 天`
- 答对一次，间隔按序列 `1 → 2 → 4 → 7 → 15 → 30` 天推进，30 天封顶
- 答错一次，`wrongCount + 1`，`nextReviewAt = 次日`，`mastery - 1`
- 连续答错 3 次，`nextReviewAt = 当天`，进入今日强制复习

- [ ] **步骤 2：先写调度测试**

覆盖：

- 新学内容进入复习池
- 间隔按固定序列推进
- 答错会重置为次日
- 连续答错 3 次会进入今日强制复习

- [ ] **步骤 3：实现复习列表查询**

接口应能返回：

- 今日待复习
- 即将到期
- 错题优先

- [ ] **步骤 4：渲染复习页**

复习页至少显示：

- 今日建议复习数
- 可开始复习按钮
- 最近错题

---

## 任务 10：实现 DeepSeek 服务端代理与 AI 讲解

**文件：**

- 创建：`app/api/ai/explain/route.ts`
- 创建：`lib/ai/deepseek.ts`
- 创建：`lib/ai/prompts.ts`
- 修改：`components/poetry/poetry-detail.tsx`

- [ ] **步骤 1：封装 DeepSeek 调用客户端**

接口示例：

```ts
export async function explainPoetry(input: {
  title: string;
  author: string;
  lines: string[];
  audience: "child" | "general";
}) {}
```

- [ ] **步骤 2：固定提示词边界与版本号**

在 `lib/ai/prompts.ts` 中定义：

- 一期 `promptVersion = "v1"`
- 受众枚举 `child | general`
- 提示词要求只做讲解，不改写原诗

- [ ] **步骤 3：实现服务端缓存逻辑**

API 路由逻辑必须为：

1. 按 `poetryId + audience + promptVersion` 拼出缓存 key
2. 先查 `Poetry.aiExplanation`
3. 命中缓存则直接返回
4. 未命中才调用 DeepSeek
5. 将结果写入对应 key 后再返回

响应结构示例：

```json
{
  "summary": "这首诗写的是……",
  "imagery": "你可以把它想成……",
  "emotion": "诗人当时……",
  "cachedAt": "2026-05-29T10:00:00Z"
}
```

- [ ] **步骤 4：详情页调用讲解接口**

页面要求：

- 先显示本地内容
- 用户点击后再加载 AI 讲解
- 请求失败时显示温和降级提示

---

## 任务 11：实现我的页面与诗人缘分榜

**文件：**

- 创建：`app/me/page.tsx`
- 创建：`lib/stats/affinity.ts`
- 创建：`components/me/profile-summary.tsx`

- [ ] **步骤 1：汇总个人学习统计**

至少返回：

- 连续学习天数
- 已浏览诗作数
- 收藏数
- 挑战正确率

- [ ] **步骤 2：实现诗人缘分计算**

基于 `LearningRecord` 聚合作者频次，固定使用 `SYSTEM_USER_ID`。

示例：

```ts
export async function getPoetAffinity(userId: string) {
  // 返回前 5 名作者与次数
}
```

- [ ] **步骤 3：渲染我的页面**

要体现：

- 成长感
- 点亮感
- 轻趣味

---

## 任务 12：补充种子数据、占位图和首批精选图清单

**文件：**

- 创建：`data/featured-poetry-ids.json`
- 修改：`data/image-assets.json`
- 修改：`public/images/poetry/`

- [ ] **步骤 1：确定首批 30 到 50 首高频名篇**

生成精选列表，例如：

- 《静夜思》
- 《春晓》
- 《咏鹅》
- 《登鹳雀楼》
- 《黄鹤楼送孟浩然之广陵》

- [ ] **步骤 2：为这些诗建立 ready 清单**

即使图片尚未全部生成完成，也要先有结构化导入清单，便于后续持续替换。

- [ ] **步骤 3：准备统一占位图**

占位图要求：

- 视觉风格与主风格一致
- 不抢正文
- 可在所有详情页与首页回退使用

---

## 任务 13：端到端联调与基础验证

**文件：**

- 修改：全项目相关文件

- [ ] **步骤 1：验证核心页面都可打开**

需要访问：

- `/`
- `/poetry/[id]`
- `/challenge`
- `/review`
- `/me`
- `/unlock`

- [ ] **步骤 2：验证核心流程**

手动验证：

- 口令验证后能进入首页
- 今日页进入详情页
- 详情页查看 AI 讲解
- 挑战作答并记录结果
- 复习页能读出待复习内容
- 我的页面能展示统计与缘分榜

- [ ] **步骤 3：记录未完成项**

单独整理：

- 尚未完成的精修配图
- 尚未补录的译文或拼音
- 二期主题切换预留点

---

## 任务 14：生产部署配置

**文件：**

- 创建：`docs/deployment.md`
- 修改：`README.md`

- [ ] **步骤 1：记录服务器基础安装**

在 `docs/deployment.md` 中写明生产服务器需安装：

- Node.js 22
- PostgreSQL 16
- Nginx
- PM2

- [ ] **步骤 2：记录首发部署流程**

部署步骤至少包含：

```bash
git clone <repo-url>
cd <repo-dir>
npm ci
npx prisma migrate deploy
npm run build
pm2 start npm --name tang-poetry -- start
pm2 save
pm2 startup
```

- [ ] **步骤 3：记录 Nginx 反向代理配置**

要求将：

- `80` 端口转发到 `3000` 端口

- [ ] **步骤 4：记录后续更新流程**

更新流程固定为：

```bash
git pull
npm ci
npx prisma migrate deploy
pm2 restart tang-poetry
```

- [ ] **步骤 5：写入访问保护的安全说明**

文档必须明确记录：

- 一期访问保护方案（`APP_PASSWORD + cookie + HTTP`）是基于家庭私有部署、无支付、无敏感个人数据、无域名阶段的权衡
- 公网 HTTP 下密码和 cookie 不具备传输加密
- 当前方案仅适用于低风险私有场景

- [ ] **步骤 6：写入 HTTPS 升级路径**

后续任务必须明确写入：

- 购买域名并完成备案
- 使用 Certbot 为 Nginx 配置 Let's Encrypt 免费证书
- 启用 HTTPS 后，将 cookie 标记为 `Secure + HttpOnly + SameSite=Strict`
- 届时 `APP_PASSWORD` 方案才具备真正的传输安全性

---

## 自检

已对照最终审查意见检查本计划：

- 已将数据库统一为 PostgreSQL 16，并补入 `docker-compose.yml`。
- 已删除 `User` 模型，改为一期单用户实现，同时保留 `userId` 维度。
- 已将“今日一诗”改为 `DailyPoetry` 排期表，不再使用日期哈希。
- 已将 `aiExplanation` 改为按 `audience + promptVersion` 的结构化缓存。
- 已将图片运行时数据源统一为数据库，JSON 只保留为导入中间产物。
- 已增加 `.gitattributes`、`.nvmrc`、`.env.example`、`docker-compose.yml` 等工程规范文件。
- 已补入任务 14 的生产部署与安全升级路径。
- 文档中的路径均使用相对路径。

---

## 执行交接

计划已保存到：

- [2026-05-29-tang-poetry-app-phase-1.md](2026-05-29-tang-poetry-app-phase-1.md)

设计规格已保存到：

- [../specs/2026-05-29-tang-poetry-app-design.md](../specs/2026-05-29-tang-poetry-app-design.md)

下一步执行更推荐直接开始实现一期骨架。
