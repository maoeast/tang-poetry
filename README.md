# 唐诗画境

面向家庭学习场景的唐诗学习 Web 应用。当前仓库已经完成一期骨架、数据库建模与唐诗导入链路，并打通了“今日一诗 -> 诗歌详情”这条核心阅读链路。

## 当前已完成

- Next.js 16 + React 19 + TypeScript 基础骨架
- Tailwind CSS 4 和 ESLint 基础配置
- 一期口令访问保护入口：`middleware.ts` + `app/unlock/page.tsx`
- 根目录工程文件：`.gitattributes`、`.nvmrc`、`docker-compose.yml`、`.env.example`
- Prisma 6.9.0 + PostgreSQL 16 基础模型与首个迁移
- 唐诗三百首清洗与导入链路：`scripts/import-ts300.ts`
- `Poetry` 与 `DailyPoetry` 数据已可导入数据库
- 首页已从 `DailyPoetry` 读取当天诗歌
- 诗歌详情页 `/poetry/[id]` 已实现基础阅读体验
- 首页“阅读全文”已可真实跳转详情页
- 诗歌详情页已接入基础相关推荐和 `view_poetry` 学习记录写入

## 当前进度

对照 [`docs/superpowers/plans/2026-05-29-tang-poetry-app-phase-1.md`](./docs/superpowers/plans/2026-05-29-tang-poetry-app-phase-1.md)：

- 已完成：任务 1 初始化全栈项目骨架
- 已完成：任务 2 建立数据库与后端基础模型
- 已完成：任务 3 导入并清洗唐诗三百首数据
- 已完成：任务 6 今日一诗首页基础读取链路
- 已完成核心链路：任务 7 诗歌详情页
- 未完成：任务 4、任务 5、任务 8 到任务 14 的主体内容

当前还没有完成的阶段包括：

- 图片资产导入与运行时图片查询链路
- 挑战系统完整闭环
- 复习池与熟练度规则
- DeepSeek AI 讲解代理
- 我的页面与诗人缘分榜
- 精选图片与占位图资产
- 全量端到端联调清单
- 生产部署文档与部署流程

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
- 设计规格：[docs/superpowers/specs/2026-05-29-tang-poetry-app-design.md](./docs/superpowers/specs/2026-05-29-tang-poetry-app-design.md)
- 实现计划：[docs/superpowers/plans/2026-05-29-tang-poetry-app-phase-1.md](./docs/superpowers/plans/2026-05-29-tang-poetry-app-phase-1.md)
- 修订意见：[docs/codex-revision-prompt-final.md](./docs/codex-revision-prompt-final.md)
