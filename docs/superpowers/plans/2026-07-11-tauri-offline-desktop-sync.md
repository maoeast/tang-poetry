# Tauri Offline Desktop and Sync Plan

> **面向 AI 代理的工作者：** 此计划是已批准方向。用户明确要求桌面端断网也能完整学习、写记录、复习、收藏，并明确不使用 Electron，使用 Tauri。实施前先确认工作树状态，分阶段执行，每阶段都必须可独立合并和回滚。

**目标：** 建设一个离线优先的 Tauri 桌面版。桌面端使用本地 SQLite 保存诗词内容、学习记录、收藏、挑战记录和复习状态；联网时与现有 Next.js + PostgreSQL 家庭服务器同步。

**非目标：**
- 不使用 Electron。
- 不把现有 Next.js App Router 服务端应用直接塞进 Tauri sidecar。
- 不把当前 Web 版改成静态导出应用。
- 不新增账号系统，不引入 `User` model，Phase 1 仍使用固定 `SYSTEM_USER_ID`。
- 不承诺 AI 讲解完全离线生成；离线只读已缓存讲解，未缓存讲解联网后生成和同步。
- 不在第一阶段解决多家庭、多账号、商业云同步。

**已批准的架构变更：**
- `AGENTS.md` 默认禁止新增数据库引擎，除非用户要求。本计划的本地 SQLite 数据层来自用户明确要求，视为该规则的显式例外。
- 服务端 PostgreSQL 仍是 Web 版和家庭服务器真源。
- 桌面端 SQLite 是本机离线真源，并通过 append-only sync event 与服务端收敛。

**官方依据，2026-07-11 核对：**
- Tauri SQL plugin 支持 SQLite、迁移和权限控制：https://v2.tauri.app/plugin/sql/
- Tauri Next.js 指南要求 Next 静态导出，并说明不支持 server-based solutions：https://v2.tauri.app/start/frontend/nextjs/
- Next.js Static Exports 有服务端能力限制：https://nextjs.org/docs/app/guides/static-exports
- Prisma 支持 PostgreSQL 和 SQLite，但当前 schema provider 是 PostgreSQL，不能无成本切换：https://www.prisma.io/docs/orm/reference/supported-databases

---

## 当前系统事实

- Web 版：Next.js 16 App Router、React 19、Prisma 6.9、PostgreSQL 16。
- 当前 Prisma schema 的 datasource 是 `postgresql`。
- 当前写入型数据包括：
  - `LearningRecord`
  - `ChallengeAttempt`
  - `ReviewState`
  - `Favorite`
  - `Poetry.aiExplanation`
- 当前内容型数据包括：
  - `Poetry`
  - `DailyPoetry`
  - `ImageAsset`
  - `AudioMeta`
  - 作者 JSON 数据和静态媒体资源
- 当前业务约束：
  - 单用户家庭部署，继续使用 `SYSTEM_USER_ID`。
  - 简繁文本来自双源字段，不使用 runtime OpenCC 作为最终显示权威。
  - 运行时图片仍以 `ImageAsset` 为权威，桌面端要复制这套语义到本地。

---

## 总体架构

```text
                         Family Server
                 Next.js + Prisma + PostgreSQL
                              |
                              | HTTPS/LAN sync API
                              |
                    push events / pull events
                              |
+-------------------------------------------------------------+
|                    Tauri Desktop App                         |
|                                                             |
|  apps/desktop React UI                                      |
|        |                                                    |
|        v                                                    |
|  lib/domain pure logic                                      |
|        |                                                    |
|        v                                                    |
|  local repository adapters                                  |
|        |                                                    |
|        v                                                    |
|  Tauri SQL plugin + SQLite                                  |
|                                                             |
|  tables: content snapshot, sync_event, local projections     |
+-------------------------------------------------------------+
```

**核心原则：**
- 本地写入先写 `sync_event`，再投影到本地状态表。
- 服务端接收事件时必须幂等。
- `ReviewState` 不作为同步真源，只作为学习、挑战、复习事件重放后的投影。
- 收藏最终状态由 `favorite_set` / `favorite_unset` 事件按顺序归并得到。
- 内容数据通过版本化快照更新，不和用户学习事件混在同一个同步流里。

---

## 数据分层

### 1. 本地只读内容快照

本地 SQLite 表：
- `content_meta`
  - `key text primary key`
  - `value text not null`
  - 关键值：`contentVersion`、`seededAt`、`sourceBuildSha`
- `poetry`
- `daily_poetry`
- `author`
- `image_asset`
- `audio_meta`

内容快照来源：
- 新增 `scripts/export-desktop-content.ts`。
- 从现有 PostgreSQL 和 JSON 生成 `apps/desktop/src/data/desktop-content.json`。
- 桌面首次启动时，Tauri SQL migration 创建 SQLite 表，再从 bundled JSON 批量导入。

为什么不用 seed `.db` 作为第一步：
- 不需要为 Node 端新增 SQLite 写库依赖。
- 构建产物更透明，JSON diff 和测试更容易。
- 现有内容体量适合首次启动导入。

### 2. 本地事件日志

本地 SQLite 表：`sync_event`

字段：
- `eventId text primary key`
- `deviceId text not null`
- `userId text not null`
- `type text not null`
- `aggregateType text not null`
- `aggregateId text not null`
- `poetryId text`
- `payload text not null`
- `occurredAt text not null`
- `syncStatus text not null`
- `serverAckAt text`
- `createdAt text not null`

事件 ID：
- 桌面端使用 `crypto.randomUUID()`。
- 排序使用 `occurredAt asc, eventId asc`。

事件类型：
- `poetry_viewed`
- `challenge_answered`
- `review_self_reported`
- `favorite_set`
- `favorite_unset`
- `ai_explanation_cached`

### 3. 本地投影表

本地 SQLite 表：
- `learning_record`
- `challenge_attempt`
- `review_state`
- `favorite`
- `ai_explanation_cache`

投影规则：
- 所有投影由 `sync_event` 计算得到。
- 桌面 UI 只读投影表，不直接把 UI 写入投影表。
- 如果投影损坏，可清空投影表并从 `sync_event` 重放。

---

## 服务端同步模型

### 新增 Prisma model

新增 `SyncEvent`，服务端仍使用 PostgreSQL：

```prisma
model SyncEvent {
  eventId       String   @id
  deviceId      String
  userId        String
  type          String
  aggregateType String
  aggregateId   String
  poetryId      String?
  payload       Json
  occurredAt    DateTime
  receivedAt    DateTime @default(now())

  @@index([userId, occurredAt])
  @@index([userId, deviceId, occurredAt])
  @@index([poetryId, occurredAt])
}
```

服务端消费事件后更新现有表：
- `poetry_viewed` -> `LearningRecord`，并同步复习状态。
- `challenge_answered` -> `ChallengeAttempt`，并同步复习状态。
- `review_self_reported` -> 学习事件和 `ReviewState` 投影更新。
- `favorite_set` / `favorite_unset` -> `Favorite` 当前状态。
- `ai_explanation_cached` -> 合并到 `Poetry.aiExplanation`。

### Sync API

新增 API：
- `POST /api/sync/push`
- `GET /api/sync/pull?since=<cursor>&deviceId=<deviceId>`
- `GET /api/sync/status`

鉴权：
- 新增服务端环境变量 `SYNC_SHARED_SECRET`。
- 桌面端首次配置输入家庭服务器地址和同步口令。
- 桌面端请求使用 `Authorization: Bearer <SYNC_SHARED_SECRET>`。
- 不复用 `APP_PASSWORD`，避免浏览口令和同步写权限混用。

Push payload：

```json
{
  "deviceId": "desktop-device-id",
  "userId": "family-001",
  "events": []
}
```

Pull response：

```json
{
  "cursor": "2026-07-11T10:00:00.000Z|event-id",
  "events": [],
  "serverTime": "2026-07-11T10:00:01.000Z"
}
```

幂等要求：
- 服务端以 `eventId` 为唯一键。
- 重复 push 同一事件必须返回成功。
- pull 不返回请求设备已经 ack 的本地事件，除非需要全量校验。

---

## 冲突策略

- 学习记录：append-only，直接合并。
- 挑战记录：append-only，直接合并。
- 收藏：同一 `userId + poetryId` 下，按 `occurredAt asc, eventId asc` 重放，最后一个 `favorite_set` / `favorite_unset` 决定当前状态。
- 复习状态：不做 last-write-wins。由 `poetry_viewed`、`challenge_answered`、`review_self_reported` 重放生成。
- AI 讲解缓存：按 audience + promptVersion 合并。若同 key 内容不同，服务端保留已有内容并记录冲突日志，桌面端下一次 pull 接受服务端版本。
- 内容快照：按 `contentVersion` 全量升级，不和事件流冲突。

---

## 阶段计划

### 任务 1：抽出可复用领域逻辑

**文件：**
- 修改：`lib/review/scheduler.ts`
- 修改：`lib/challenge/engine.ts`
- 修改：`lib/favorite/repository.ts`
- 新增：`lib/sync/events.ts`
- 新增：`lib/sync/projections.ts`

- [ ] 将复习状态计算整理为不依赖 Prisma 的纯函数。
- [ ] 将挑战答题 payload 标准化为可事件化的结构。
- [ ] 定义 `SyncEvent` TypeScript 类型和事件 payload 类型。
- [ ] 为事件投影增加 `node:test` 覆盖。
- [ ] 保持现有 Web repository API 不变。

**验收：**
- `npm test`
- `npm run build`
- 现有 Web 端收藏、挑战、复习测试不回归。

### 任务 2：生成桌面内容快照

**文件：**
- 新增：`scripts/export-desktop-content.ts`
- 新增：`apps/desktop/src/data/desktop-content.json`
- 新增：`tests/scripts/export-desktop-content.test.ts`

- [ ] 从 Postgres 读取 `Poetry`、`DailyPoetry`、`ImageAsset`、`AudioMeta`。
- [ ] 从 `data/authors.json` 读取作者信息。
- [ ] 输出版本化 JSON：`contentVersion`、`sourceBuildSha`、`exportedAt`。
- [ ] 保留双源简繁字段，不在导出阶段做 OpenCC 转换。
- [ ] 图片字段保留 `ImageAsset` 语义，缺图仍指向 `/images/placeholders/default-poetry-card.jpg`。

**验收：**
- `npm test`
- `npm run build`
- 导出的 JSON 可以覆盖首页、浏览页、详情页、作者页所需字段。

### 任务 3：建立 Tauri 桌面壳和本地 SQLite

**文件：**
- 新增：`apps/desktop/package.json`
- 新增：`apps/desktop/src/`
- 新增：`src-tauri/`
- 新增：`src-tauri/capabilities/default.json`
- 新增：`src-tauri/migrations/0001_initial.sql`
- 修改：根 `package.json`

- [ ] 使用 Tauri v2。
- [ ] 使用 Tauri SQL plugin，启用 SQLite。
- [ ] 配置默认窗口：`1280x860`，最小 `1024x720`。
- [ ] 默认只授予 SQL load/select/execute 所需权限，不开放 shell 任意命令。
- [ ] 首次启动时创建 SQLite 表。
- [ ] 首次启动时从 bundled `desktop-content.json` 导入内容快照。
- [ ] 生成并持久化 `deviceId`。

**验收：**
- `npm run desktop:dev`
- `npm run desktop:build`
- 断网启动桌面端，能进入首页并读取本地内容。

### 任务 4：桌面只读学习体验 MVP

**文件：**
- 新增：`apps/desktop/src/pages/home`
- 新增：`apps/desktop/src/pages/browse`
- 新增：`apps/desktop/src/pages/poetry-detail`
- 新增：`apps/desktop/src/local-repositories/`
- 复用或移动：可复用展示组件到 `components/`

- [ ] 首页从本地 SQLite 读取今日诗。
- [ ] 浏览页从本地 SQLite 读取分类和搜索结果。
- [ ] 详情页从本地 SQLite 读取诗文、注释、译文、图片、音频元数据。
- [ ] 桌面端 UI 按桌面/平板工作台方向设计，不按手机 H5 方向设计。
- [ ] AI 讲解未缓存时显示联网后可生成，不阻断离线阅读。

**验收：**
- 断网可打开首页、浏览、详情。
- 1024px、1366px 截图无明显布局问题。

### 任务 5：离线写入和本地投影

**文件：**
- 新增：`apps/desktop/src/sync/local-event-store.ts`
- 新增：`apps/desktop/src/sync/projectors.ts`
- 新增：`apps/desktop/src/local-repositories/favorite.ts`
- 新增：`apps/desktop/src/local-repositories/review.ts`
- 新增：`apps/desktop/src/local-repositories/challenge.ts`

- [ ] 收藏写入 `favorite_set` / `favorite_unset` 事件。
- [ ] 阅读详情写入 `poetry_viewed` 事件。
- [ ] 挑战答题写入 `challenge_answered` 事件。
- [ ] 复习自评写入 `review_self_reported` 事件。
- [ ] 事件写入后同步更新本地投影表。
- [ ] 应用重启后本地学习状态保持。

**验收：**
- 断网收藏、阅读、挑战、复习均可写入。
- 重启桌面端后收藏和复习状态仍存在。
- 清空投影表后可由 `sync_event` 重放恢复。

### 任务 6：服务端同步 API

**文件：**
- 修改：`prisma/schema.prisma`
- 新增迁移：`prisma/migrations/*_add_sync_event/`
- 新增：`app/api/sync/push/route.ts`
- 新增：`app/api/sync/pull/route.ts`
- 新增：`app/api/sync/status/route.ts`
- 新增：`lib/sync/server.ts`

- [ ] 新增 `SyncEvent` model。
- [ ] 增加 `SYNC_SHARED_SECRET` 环境变量说明。
- [ ] 实现 push 幂等写入。
- [ ] 实现 pull cursor。
- [ ] 服务端消费事件并更新现有表。
- [ ] 不引入 `User` model，继续使用 `SYSTEM_USER_ID`。

**验收：**
- `npm run prisma:generate`
- `npm test`
- `npm run build`
- 重复 push 同一事件不会重复创建业务记录。

### 任务 7：桌面双向同步

**文件：**
- 新增：`apps/desktop/src/sync/client.ts`
- 新增：`apps/desktop/src/settings/sync-settings.tsx`
- 新增：`tests/sync/offline-sync.test.ts`

- [ ] 桌面端配置 `serverUrl` 和 `syncToken`。
- [ ] push 本地 pending 事件。
- [ ] pull 服务端新事件。
- [ ] 本地幂等应用远端事件。
- [ ] 维护 `sync_checkpoint`。
- [ ] 显示同步状态：离线、本地待同步数量、上次同步时间、同步错误。

**验收：**
- 桌面离线收藏一首诗，联网同步后 Web `/me` 可见。
- Web 端产生学习记录，桌面 pull 后复习队列更新。
- 两端重复同步不产生重复记录。

### 任务 8：媒体资产离线策略

**文件：**
- 新增：`scripts/export-desktop-media-manifest.ts`
- 新增：`docs/desktop-media-pack.md`
- 可能新增：`apps/desktop/src/media/`

- [ ] 核算当前图片和音频资产体积。
- [ ] 生成桌面媒体 manifest。
- [ ] 第一版桌面包内置优化后的封面图和占位图。
- [ ] 完整音频和高分辨率图片作为可选 media pack。
- [ ] 缺少本地媒体时使用本地占位图，不请求网络。

**验收：**
- 无 media pack 时核心学习功能完整可用。
- 有 media pack 时图片和音频均可离线访问。

### 任务 9：打包、文档和回归验证

**文件：**
- 新增：`docs/desktop-offline-sync.md`
- 修改：`README.md`
- 修改：`.env.example`
- 修改：`package.json`

- [ ] 增加桌面开发命令：`npm run desktop:dev`。
- [ ] 增加桌面构建命令：`npm run desktop:build`。
- [ ] 文档说明首次配置、离线能力、同步口令、媒体包策略。
- [ ] Linux 包先通过；Windows/macOS 后续按目标平台补充。

**验收：**
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run desktop:build`
- 手动断网验收核心功能。

---

## 验证矩阵

| 场景 | 期望 |
|---|---|
| 首次安装，断网启动 | 能导入 bundled 内容并进入首页 |
| 断网阅读诗歌详情 | 能显示诗题、作者、正文、译文、注释、本地图片或占位图 |
| 断网收藏 | 收藏状态立即变化，重启后保持 |
| 断网挑战 | 能完成题目并写入本地挑战事件 |
| 断网复习 | 能读取本地队列并写入复习自评事件 |
| 联网 push | pending 事件上传后标记 ack |
| 联网 pull | Web 端新事件同步到桌面端 |
| 重复同步 | 不产生重复学习记录、挑战记录、收藏记录 |
| 投影损坏 | 可从 `sync_event` 重建 |
| 服务端无 `SYNC_SHARED_SECRET` | sync API 拒绝写入，Web 原功能不受影响 |

---

## 回滚策略

- 任务 1 到 5 不改服务端数据库，可直接删除 `apps/desktop/`、`src-tauri/`、本地导出脚本和桌面命令回滚。
- 任务 6 开始涉及 PostgreSQL schema。回滚前先停止 sync API，保留 `SyncEvent` 数据导出，再按 Prisma migration 策略处理。
- 桌面端 SQLite 是本机数据，任何破坏性迁移前必须先导出 `sync_event`。
- 若同步策略出现错误，优先停止 push，保留 pull 和本地离线功能。

---

## 主要风险和应对

- **资产体积风险：** 当前生成图片体积较大。第一版内置优化封面和占位图，完整媒体包独立分发。
- **同步复杂度风险：** 不同步 `ReviewState` 作为真源，改用事件重放，降低冲突。
- **UI 复用风险：** 当前 Next Server Components 不能直接复用到桌面。桌面端新建 React UI，复用纯组件和领域逻辑。
- **数据迁移风险：** 服务端 schema 改动只在同步 API 阶段引入，前五个任务先证明离线桌面可行。
- **安全风险：** 同步写权限使用独立 `SYNC_SHARED_SECRET`，不复用家庭访问口令。

---

## 当前推荐下一步

先实施任务 1 和任务 2，目标是得到一个可测试的 `desktop-content.json` 和事件类型定义。不要一开始就改 Prisma schema 或搭 Tauri UI；先证明内容快照和事件模型能覆盖现有业务面。
