# 唐诗画境

面向家庭学习场景的唐诗学习 Web 应用。当前仓库已经完成一期骨架、数据库建模与唐诗导入链路，并已打通首页、详情、挑战、复习、我的页面与 AI 讲解的基础闭环。

## 当前已完成

- Next.js 16 + React 19 + TypeScript 基础骨架
- Tailwind CSS 4 和 ESLint 基础配置
- 一期口令访问保护入口：`middleware.ts` + `app/unlock/page.tsx`
- 根目录工程文件：`.gitattributes`、`.nvmrc`、`docker-compose.yml`、`.env.example`
- Prisma 6.9.0 + PostgreSQL 16 基础模型与首个迁移
- 唐诗三百首清洗与导入链路：`scripts/import-ts300.ts`
- `Poetry` 与 `DailyPoetry` 数据已可导入数据库
- 首页已从 `DailyPoetry` 读取当天诗歌，并接入 `ImageAsset` 运行时主视觉图
- 诗歌详情页 `/poetry/[id]` 已实现基础阅读体验
- 诗歌详情页已接入 `ImageAsset` 运行时头图
- 首页“阅读全文”已可真实跳转详情页
- 诗歌详情页已接入基础相关推荐和 `view_poetry` 学习记录写入
- 挑战页已接入四类题型、即时反馈、挑战记录和学习记录联动
- 复习页已接入固定调度规则、待复习列表和最近错题
- 复习页复习卡片已接入 `ImageAsset` 运行时缩略图
- AI 讲解接口与详情页懒加载卡片已接通
- 我的页面已接入学习统计与诗人缘分榜
- 首页、详情、复习、我的页面已完成一期视觉收口，`/me` 页头已改为结构化诗画语汇 banner
- 首批音频资产与播放能力已接入仓库范围，作为一期内容增强的已完成项

## 当前进度

对照 [`docs/superpowers/plans/2026-05-29-tang-poetry-app-phase-1.md`](./docs/superpowers/plans/2026-05-29-tang-poetry-app-phase-1.md)：

- 已完成：任务 1 初始化全栈项目骨架
- 已完成：任务 2 建立数据库与后端基础模型
- 已完成：任务 3 导入并清洗唐诗三百首数据
- 已完成：任务 6 今日一诗首页基础读取链路
- 已完成：任务 7 诗歌详情页
- 已完成：任务 8 挑战系统基础闭环
- 已完成：任务 9 复习池与熟练度规则
- 已完成：任务 10 DeepSeek 服务端代理与 AI 讲解基础链路
- 已完成：任务 11 我的页面与诗人缘分榜
- 已部分完成：任务 12 补充种子数据、占位图和运行时图片接入
- 未完成主体：任务 13 端到端联调与基础验证、任务 14 生产部署配置

当前还没有完成的阶段包括：

- 非关键卡片位的运行时图片统一接入
- 精选图片资产的持续替换与质量验收
- AI 讲解依赖的本地密钥配置与真实联调补证
- 任务 13 剩余的 AI 讲解、挑战写库、`SYSTEM_USER_ID` 降级联调
- 生产部署文档与部署流程

## 视觉与音频升级范围

本轮已经完成的范围：

- 首页今日一诗主视觉、详情页头图、复习卡片缩略图已统一走数据库 `ImageAsset`
- `/me` 页面保留结构化统计区与诗人缘分榜，页头升级为非全屏的结构化诗画语汇 banner
- 仓库已纳入首批音频相关资产与实现文件，用于一期朗读/听感增强

仍未在本轮解决的项：

- 挑战页、相关推荐等非关键卡片位尚未统一接入运行时图片
- 精选视觉资产仍需继续补齐与人工验收
- 音频内容质量、更多朗读策略与无障碍细节属于二期继续打磨范围

## 环境要求

- Node.js 22
- npm 10+
- Docker Desktop、Docker Engine 或兼容的 Docker Compose 环境

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 复制环境变量模板

```bash
cp .env.example .env
```

Windows PowerShell 可以执行：

```powershell
Copy-Item .env.example .env
```

3. 启动本地 PostgreSQL 16

```bash
docker compose up -d
```

如果你的系统里旧的 `docker-compose` 命令可用但报错，请直接改用 `docker compose`。

4. 执行数据库迁移

```bash
./node_modules/.bin/prisma migrate dev
```

5. 导入唐诗数据与每日排期

```bash
npm run import:ts300
```

6. 启动开发服务器

```bash
npm run dev
```

7. 打开浏览器访问

```text
http://localhost:3000
```

如果设置了 `APP_PASSWORD`，首次访问会跳转到 `/unlock`，输入口令后才能进入应用。

## 环境变量

项目使用 `.env` 管理本地环境变量，完整字段见 [`.env.example`](./.env.example)。

- `DATABASE_URL`：本地 PostgreSQL 连接串
- `DEEPSEEK_API_KEY`：DeepSeek API 密钥
- `DEEPSEEK_BASE_URL`：DeepSeek 服务地址
- `APP_URL`：应用外部访问地址
- `APP_PASSWORD`：一期家庭部署口令
- `SYSTEM_USER_ID`：一期固定单用户 ID
- `AUDIO_BASE_URL`：可选，音频 CDN / 对象存储前缀；未设置时默认读 `/audio/poetry`
- `STEPFUN_API_KEY`：可选，仅离线生成 TTS 音频脚本使用

## 音频资产管理

- 运行时音频文件约定目录是 `public/audio/poetry/`
- 文件名优先使用 `Poetry.sourceUid`，回退到 `poetryId`，由 [`lib/audio.ts`](./lib/audio.ts) 统一映射
- 仓库默认 **不跟踪** `public/audio/`，避免把大体积二进制资产直接放进 Git 历史
- 本地开发可直接把成品 mp3 放在 `public/audio/poetry/`
- 生产环境推荐把同目录内容同步到对象存储或 CDN，并通过 `AUDIO_BASE_URL` 切换访问前缀
- 离线补音可用 [`scripts/generate-tts-audio.py`](./scripts/generate-tts-audio.py)，脚本会把文件写入运行时音频目录，且必须通过环境变量注入 `STEPFUN_API_KEY`

更完整的策略见 [docs/audio-asset-strategy.md](./docs/audio-asset-strategy.md)。

## 本地验证

推荐在数据库启动并完成导入后执行：

```bash
npm test
npm run lint
npm run build
```

如果要快速确认数据库数据量，可执行：

```bash
node -e 'const {PrismaClient}=require("@prisma/client"); const db=new PrismaClient(); Promise.all([db.poetry.count(), db.dailyPoetry.count()]).then(([p,d])=>{console.log({poetry:p,dailyPoetry:d});}).finally(()=>db.$disconnect())'
```

## 相关文档

- 交接文档：[HANDOFF.md](./HANDOFF.md)
- 任务 13 缺口清单：[docs/task-13-gap-list.md](./docs/task-13-gap-list.md)
- 设计规格：[docs/superpowers/specs/2026-05-29-tang-poetry-app-design.md](./docs/superpowers/specs/2026-05-29-tang-poetry-app-design.md)
- 实现计划：[docs/superpowers/plans/2026-05-29-tang-poetry-app-phase-1.md](./docs/superpowers/plans/2026-05-29-tang-poetry-app-phase-1.md)
- 修订意见：[docs/codex-revision-prompt-final.md](./docs/codex-revision-prompt-final.md)
