# Docs Index

本文件是项目文档路由。代理启动时不要全量读取 `docs/`，先按任务类型从这里选最小文档集。

## 入口文档

| 需求 | 读取 |
|---|---|
| 当前会话交接和下一步 | `.continue-here.md` |
| 代理规则 | `AGENTS.md` |
| Claude Code 入口 | `CLAUDE.md` |
| 会话启动和结束流程 | `HANDOFF.md` |
| 文档路由本身 | `docs/INDEX.md` |
| 稳定项目事实和全局约束 | `PROJECT_CONTEXT.md` |
| 安装、环境变量、常用流程 | `README.md` |

## 当前工作

| 需求 | 读取 | 状态 |
|---|---|---|
| 当前代码和 UI 稳定化修复 | `docs/superpowers/plans/2026-07-11-code-ui-stabilization.md` | 当前可执行计划 |
| Tauri 离线优先桌面端和同步 | `docs/superpowers/plans/2026-07-11-tauri-offline-desktop-sync.md` | 已批准方向，待实施 |

## 产品与架构规格

| 需求 | 读取 | 用法 |
|---|---|---|
| 一期产品定位、信息架构、数据模型和验收边界 | `docs/superpowers/specs/2026-05-29-tang-poetry-app-design.md` | 历史总规格，做方向校验 |
| 诗人详情页设计 | `docs/superpowers/specs/2026-05-31-author-page-design.md` | 诗人页和作者数据相关改动前阅读 |
| 诗歌内容简繁双源和切换规则 | `docs/superpowers/specs/2026-05-31-tang-poetry-script-variant-design.md` | 简繁、SSR、cookie、文本权威源相关改动前阅读 |
| 批量 AI 讲解和讲解音频设计 | `docs/superpowers/specs/2026-06-05-batch-ai-explain-design.md` | AI 讲解缓存和讲解音频相关改动前阅读 |

## 实现计划

| 需求 | 读取 | 用法 |
|---|---|---|
| Phase 1 历史实现计划 | `docs/superpowers/plans/2026-05-29-tang-poetry-app-phase-1.md` | 历史参考，不当作当前进度 |
| 诗人详情页历史实现计划 | `docs/superpowers/plans/2026-05-31-author-page-implementation.md` | 作者页实现细节参考 |
| ts300 数据完整性计划 | `docs/superpowers/plans/2026-06-19-ts300-data-integrity.md` | 审计和修复 ts300 编号、图片、音频错配时阅读 |
| 代码和 UI 稳定化计划 | `docs/superpowers/plans/2026-07-11-code-ui-stabilization.md` | 当前可执行计划 |
| Tauri 离线优先桌面端和同步计划 | `docs/superpowers/plans/2026-07-11-tauri-offline-desktop-sync.md` | 桌面端、本地 SQLite、离线写入、同步机制相关工作前阅读 |

## 数据、内容与资产

| 需求 | 读取 | 用法 |
|---|---|---|
| 译文和注释覆盖情况 | `docs/annotation-gap-report.md` | 查看 gs300、sc200、ts300 注释和译文缺口 |
| 音频资产存放、CDN、TTS 脚本 | `docs/audio-asset-strategy.md` | 诗歌朗读音频相关改动前阅读 |
| AI 讲解文本和讲解音频批处理任务 | `docs/task-batch-ai-explain-tts.md` | 批量生成 AI 讲解或 TTS 时阅读 |
| 诗图生成执行方案 | `docs/image-generation-plan.md` | 图片生成管线和导入流程参考 |
| 诗图 Prompt 视觉规则 | `docs/poetry-image-prompt-guide.md` | 调整图片 Prompt 或风格版本前阅读 |
| 图片生成清单 | `docs/image-generation-manifest.md` | 查批次、promptVersion、产物位置 |
| 任务 13 联调和验证记录 | `docs/task-13-gap-list.md` | 查历史 E2E、缺口、联调证据；当前状态需再验证 |

## UI 与视觉

| 需求 | 读取 | 用法 |
|---|---|---|
| 全局新中式色彩、字体和复习页视觉方案 | `docs/全局设计规范重构.md` | UI 方向和复习页改造参考 |
| 首页改版思路 | `docs/首页改版.md` | 首页布局和视觉方案历史参考 |
| 诗歌分类页中式视觉方案 | `docs/诗歌分类中式.md` | `/browse` 分类页样式参考 |
| 当前截图证据 | `docs/screenshots/` | 只作历史截图参考，UI 真相以当前运行页面为准 |

### 截图清单

| 页面 | 文件 |
|---|---|
| 首页 | `docs/screenshots/homepage-desktop.png`, `docs/screenshots/homepage-mobile.png` |
| 浏览页 | `docs/screenshots/browse-desktop.png`, `docs/screenshots/browse-mobile.png` |
| 李白作者页 | `docs/screenshots/author-libai-desktop.png`, `docs/screenshots/author-libai-mobile.png` |
| 无名氏作者页 | `docs/screenshots/author-wuming-desktop.png`, `docs/screenshots/author-wuming-mobile.png` |
| 岑参作者页修复截图 | `docs/screenshots/author-censhen-fixed-desktop.png` |

## 部署与运维

| 需求 | 读取 | 用法 |
|---|---|---|
| 生产部署、Nginx、PM2、PostgreSQL、更新流程 | `docs/deployment.md` | 部署和服务器维护时阅读 |

## 元治理与历史修订

| 需求 | 读取 | 用法 |
|---|---|---|
| AGENTS / CLAUDE / 会话交接治理经验 | `docs/写好AGENTS-CLAUDE与会话交接的实战经验.md` | 维护代理规则和交接机制时阅读 |
| 给 Codex 的一期修订建议 | `docs/codex-revision-prompt-final.md` | 历史修订背景，不当作当前实现真相 |

## 使用规则

- 当前实现以代码和数据库为准，文档只作路由和历史依据。
- 历史计划和历史截图不能直接证明当前状态。涉及 UI 或运行行为时，必须重新跑应用或测试。
- 涉及 schema 的改动遵守 `AGENTS.md`，重新生成 Prisma client 并重启服务，不加旧 client 兼容分支。
- 涉及图片运行时读取时，以 `ImageAsset` 为唯一真源。
- 涉及简繁切换时，先读简繁双源规格，固定 UI 文案不参与切换。
