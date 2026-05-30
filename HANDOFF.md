# HANDOFF

## 项目概况

这个项目是“唐诗画境”，一个面向家庭学习场景的唐诗学习 Web 应用。

一期已经确定的核心方向：
- 儿童绘本水彩主视觉
- 今日一诗
- 诗歌详情阅读
- 挑战闯关
- 复习调度
- 我的成长
- AI 讲解
- 每首诗的意境配图

当前工作应继续严格按：
- `docs/superpowers/plans/2026-05-29-tang-poetry-app-phase-1.md`

里的任务顺序执行，不要跳步骤，不要重开架构讨论。

---

## 当前真实进度

当前不是“只有骨架”，而是已经完成了前半段核心链路。

### 已完成：任务 1 初始化全栈项目骨架

已落地内容：
- Next.js 16 + React 19 + TypeScript 项目骨架
- Tailwind CSS 4 基础配置
- ESLint 基础配置
- 根目录工程文件：
  - `.gitattributes`
  - `.nvmrc`
  - `docker-compose.yml`
  - `.env.example`
  - `README.md`
- 一期访问保护：
  - `middleware.ts`
  - `app/unlock/page.tsx`
  - `app/unlock/actions.ts`
- 全局样式与主题变量：
  - `app/globals.css`

### 已完成：任务 2 建立数据库与后端基础模型

已落地内容：
- Prisma 6.9.0
- `prisma/schema.prisma`
- `lib/db.ts`
- `.env`
- 初始迁移：
  - `prisma/migrations/20260529101519_init/migration.sql`

当前 Prisma 模型：
- `Poetry`
- `ImageAsset`
- `DailyPoetry`
- `LearningRecord`
- `ChallengeAttempt`
- `ReviewState`
- `Favorite`

注意：
- 一期不做 `User` 模型
- 所有学习记录相关表保留 `userId`
- 一期固定使用 `SYSTEM_USER_ID`

### 已完成：任务 3 导入并清洗唐诗三百首数据

已落地文件：
- `lib/poetry/normalize.ts`
- `lib/poetry/daily-seed.ts`
- `lib/poetry/daily.ts`
- `scripts/import-ts300.ts`
- `tests/poetry/normalize.test.ts`
- `tests/poetry/daily.test.ts`
- `data/poetries.normalized.json`
- `data/ts300.raw.json`

已完成能力：
- 使用 `opencc-js` 做繁转简展示字段清洗
- 保留原文字段：
  - `titleOriginal`
  - `authorOriginal`
- 生成展示字段：
  - `title`
  - `author`
- 将 `paragraphs` 清洗为 `lines`
- 生成稳定内部主键：
  - `ts300-0001`
  - `ts300-0002`
  - …
- 生成未来 365 天 `DailyPoetry` 排期
- 标准化 JSON 输出
- 导入 PostgreSQL

当前导入结果：
- `Poetry`：366 条
- `DailyPoetry`：365 条

### 已完成：任务 6 今日一诗首页基础读取链路

已落地内容：
- `app/page.tsx` 已从数据库 `DailyPoetry -> Poetry -> ImageAsset` 读取当天诗歌与运行时主视觉图
- 首页当前展示：
  - 标题
  - 作者
  - 朝代
  - 前两句
  - 今日主视觉图
  - “阅读全文”按钮

### 已完成：任务 7 诗歌详情页

已落地文件：
- `app/poetry/[id]/page.tsx`
- `lib/poetry/repository.ts`
- `components/poetry/poetry-detail.tsx`
- `tests/poetry/repository.test.ts`

已完成能力：
- 按 `id` 查询诗歌详情
- 详情页展示：
  - 标题
  - 作者
  - 朝代
  - 运行时头图
  - 全文
  - 译文占位
  - 拼音占位
- 支持相关推荐
  - 同作者 / 同主题优先
- 打开详情页时写入一次：
  - `LearningRecord.eventType = "view_poetry"`
- 首页“阅读全文”已可真实跳转 `/poetry/[id]`
- 缺失诗歌时走 `notFound()`

### 已完成：任务 8 挑战系统基础闭环

已落地内容：
- `app/challenge/page.tsx`
- `components/challenge/challenge-runner.tsx`
- `lib/challenge/engine.ts`
- `lib/challenge/judge.ts`
- `tests/challenge/judge.test.ts`

已完成能力：
- 四类题型：`couplet`、`author`、`title`、`ordering`
- 开始挑战、逐题作答、即时反馈、结果页
- 写入 `ChallengeAttempt`
- 同步写入 `LearningRecord`

### 已完成：任务 9 复习池与熟练度规则

已落地内容：
- `app/review/page.tsx`
- `components/review/review-list.tsx`
- `lib/review/scheduler.ts`
- `tests/review/scheduler.test.ts`

已完成能力：
- 固定复习间隔序列
- 今日待复习 / 即将到期 / 最近错题
- 复习卡片运行时缩略图已通过 `ImageAsset` 接入
- `view_poetry` 和挑战结果会驱动复习状态更新

### 已完成：任务 10 DeepSeek 服务端代理与 AI 讲解基础链路

已落地内容：
- `app/api/ai/explain/route.ts`
- `lib/ai/deepseek.ts`
- `lib/ai/prompts.ts`
- `components/poetry/ai-explanation-card.tsx`
- `tests/ai/explain-route.test.ts`
- `tests/ai/prompts.test.ts`

已完成能力：
- 详情页点击后加载 AI 讲解
- 按 `{audience}_{promptVersion}` 命中缓存
- 缓存未命中时再请求 DeepSeek

### 已完成：任务 11 我的页面与诗人缘分榜

已落地内容：
- `app/me/page.tsx`
- `components/me/profile-summary.tsx`
- `lib/stats/affinity.ts`
- `tests/stats/affinity.test.ts`

已完成能力：
- 连续学习、已读诗作、收藏数、挑战正确率
- 诗人缘分榜 Top 5
- `/me` 页头已从普通介绍卡收口为结构化诗画语汇 banner
- 快捷入口保留 `/challenge` 与 `/review`
- 挑战正确率统计已明确排除 `review_self_report`

### 已完成：视觉与音频增强收口

已落地内容：
- 首页今日一诗主视觉、详情页头图、复习页缩略图均已接入运行时图片
- 首批音频相关资产与实现文件已进入仓库
- `/me` 页面已完成一期视觉收口，不再使用全屏沉浸海报方案

当前边界：
- 视觉升级已覆盖关键页面与关键卡位，但不是所有卡片位都已统一
- 音频能力已具备一期落地基础，仍需后续补做内容质量和完整体验校验

---

## 尚未完成的任务

对照 `docs/superpowers/plans/2026-05-29-tang-poetry-app-phase-1.md`：

未完成主体任务：
- 任务 12：补充种子数据、占位图和首批精选图清单的剩余收口
- 任务 13：端到端联调与基础验证
- 任务 14：生产部署配置

下一步不应再从任务 8 重做。当前应继续：
1. 收尾任务 12 的首批精选图与非关键卡片位图片接入
2. 继续按 `docs/task-13-gap-list.md` 收口任务 13 剩余缺口
3. 最后进入任务 14 的部署配置

任务 13 缺口清单：
- `docs/task-13-gap-list.md`

## 剩余风险与二期预留

当前仍需留意的风险：

- `DEEPSEEK_API_KEY` 未配置时，AI 讲解链路仍会失败
- 挑战页真实作答写库尚缺一次浏览器级实证联调
- `SYSTEM_USER_ID` 缺失场景仍需单独验证降级表现
- 非关键卡片位的运行时图片仍存在占位图回退

建议作为二期或后续收口继续处理的内容：

- 挑战页、相关推荐等卡片位的图片统一化
- 译文、拼音、更多精选图与音频内容质量完善
- 更完整的朗读体验、主题切换与视觉风格扩展

---

## 已验证结果

这次会话里已经真实确认：

- 依赖已安装完成：`npm install`
- Docker 已恢复可用
- PostgreSQL 容器已成功启动
- Prisma 迁移已成功执行
- 唐诗数据与每日排期已成功导入

用户本机已真实执行成功：
- `docker compose up -d`
- `./node_modules/.bin/prisma migrate dev`
- `npm run import:ts300`
- 数据量校验输出：
  - `{ poetry: 366, dailyPoetry: 365 }`

本工作区已真实执行通过：
- `npm test`
- `npm run lint`
- `npm run build`

当前 `next build` 输出里关键路由已存在：
- `/`
- `/poetry/[id]`
- `/challenge`
- `/review`
- `/me`
- `/api/ai/explain`
- `/unlock`

注意：
- `build` 仍会提示 Next.js 16 的 `middleware` 弃用警告
- 这不是当前阻塞项

---

## Docker / 数据库环境结论

这次已经排清的关键问题：

1. 旧命令 `docker-compose up -d` 在当前环境里不要再用
2. 正确命令是：

```bash
docker compose up -d
```

3. 之前的 Docker 问题不是项目代码问题，而是：
- 旧 `docker-compose` Python 版兼容性问题
- 当前 shell 没拿到 `docker` 组权限

用户已经修复到可用状态。

后续默认命令：

```bash
docker compose up -d
```

README 和其余文档里的命令示例已经统一更新为 `docker compose up -d`。

---

## 2026-05-30 任务 13 联调结论

本轮已真实完成一轮本地联调记录，验证方式是：
- 临时用 `APP_PASSWORD=family123 npm run dev` 启动应用
- 用本地 HTTP 请求与 cookie 会话验证 `/unlock`、`/`、`/poetry/[id]`、`/challenge`、`/review`、`/me`

已确认通过：
- `/unlock` 可正常渲染，未带 cookie 访问 `/` 会 307 跳到 `/unlock?next=%2F`
- 提交口令后可收到 `tang-poetry-session=verified` cookie 并保持会话
- 2026-05-30 首页命中 `DailyPoetry -> ts300-0002 / 登幽州台歌`
- `/poetry/ts300-0002` 可正常渲染；打开详情后 `LearningRecord` 从 `8` 增至 `9`
- 同一首诗的 `ReviewState.lastReviewedAt` / `nextReviewAt` 已随详情访问刷新
- `/review` 可读出 `todayDue = 0`、`recentWrong = 0`、`upcoming = 1`
- `/review` 复习卡片缩略图当前已按缺图策略回退占位图
- `/me` 可展示学习统计与诗人缘分榜，当前榜首是 `陈子昂`

本轮明确缺口：
- `POST /api/ai/explain` 返回 `500`，根因是缺少 `DEEPSEEK_API_KEY`
- `/challenge` 页面题面已渲染，但还没完成真实作答提交，因此 `ChallengeAttempt` 仍是 `0`
- 还没验证移除 `SYSTEM_USER_ID` 后的页面降级表现

下一步直接继续：
1. 配置本地 `DEEPSEEK_API_KEY` 后重测 AI 讲解
2. 用真实浏览器完成一轮挑战作答并核对三表写库
3. 临时移除 `SYSTEM_USER_ID` 做一次降级联调

## 当前重要文件

本轮实现重点文件：
- `app/page.tsx`
- `app/poetry/[id]/page.tsx`
- `app/challenge/page.tsx`
- `app/review/page.tsx`
- `app/me/page.tsx`
- `components/poetry/poetry-detail.tsx`
- `components/poetry/ai-explanation-card.tsx`
- `lib/poetry/daily.ts`
- `lib/poetry/repository.ts`
- `lib/images/repository.ts`
- `tests/poetry/daily.test.ts`
- `tests/poetry/repository.test.ts`
- `tests/images/repository.test.ts`
- `README.md`

关键文档：
- `HANDOFF.md`
- `docs/codex-revision-prompt-final.md`
- `docs/superpowers/specs/2026-05-29-tang-poetry-app-design.md`
- `docs/superpowers/plans/2026-05-29-tang-poetry-app-phase-1.md`

---

## 下一会话必须遵守的执行方式

下一会话不要再讨论方案，不要重新评估是否做详情页，不要回退已完成工作。

执行要求：
- 先阅读：
  1. `HANDOFF.md`
  2. `docs/codex-revision-prompt-final.md`
  3. `docs/superpowers/specs/2026-05-29-tang-poetry-app-design.md`
  4. `docs/superpowers/plans/2026-05-29-tang-poetry-app-phase-1.md`
- 然后直接继续未完成任务
- 按 TDD 执行
- 先写失败测试，再写实现
- 做完后必须跑验证命令

---

## 下一步建议

**从任务 8 开始继续：实现挑战系统基础闭环。**

优先顺序：
1. `tests/challenge/judge.test.ts`
2. `lib/challenge/judge.ts`
3. `lib/challenge/engine.ts`
4. `components/challenge/challenge-runner.tsx`
5. `app/challenge/page.tsx`

任务 8 的明确目标：
- 实现 `normalizeAnswer`
- 实现 `judgeCouplet`
- 覆盖：
  - 忽略标点
  - 忽略空格
  - 错误答案返回 false
- 支持题型：
  - `couplet`
  - `author`
  - `title`
  - `ordering`
- `ordering` 必须覆盖：
  - 打乱结果若与原顺序相同，必须重新随机
- 挑战结果写入：
  - `ChallengeAttempt`
  - `LearningRecord`

---
