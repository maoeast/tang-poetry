## 2026-05-29

- 新增全局数据流：`LearningRecord.eventType = "view_poetry"` 会初始化或重置 `ReviewState` 的首次复习入池时间。
- 新增全局数据流：`challenge_correct` / `challenge_wrong` 会驱动 `ReviewState` 的固定间隔推进、答错重置和连续三错当日强制复习。
- 一期复习规则已固化在 `lib/review/scheduler.ts`，间隔序列固定为 `1 -> 2 -> 4 -> 7 -> 15 -> 30` 天。
- 新增全局 AI 数据流：`POST /api/ai/explain` 先查 `Poetry.aiExplanation[audience_promptVersion]`，未命中才调用 DeepSeek 并回写缓存。
- 新增全局约束：AI 讲解缓存 key 固定为 `{audience}_{promptVersion}`，一期只允许 `child_v1` 与 `general_v1`。
- 新增全局图片数据流：首页、详情页与复习卡片统一通过 `getPoetryImage(poetryId)` 读取 `ImageAsset`，运行时不再直接消费图片 JSON。
- 新增全局约束：一期运行时图片唯一数据源是数据库 `ImageAsset`，缺图只能回退 `/images/placeholders/default-poetry-card.jpg`。
- 新增全局联调基线：任务 13 的缺口与手工验证入口统一记录在 `docs/task-13-gap-list.md`。

## 2026-05-31

- 新增全局数据约束：唐诗展示文本改为双权威源，简体以 `data/ts300.simple.json` 为准，繁体以 `data/ts300.raw.json` 为准，禁止使用运行时 OpenCC 作为最终展示文本来源。
- 新增全局展示约束：简繁切换仅作用于诗题、作者、正文，不包含固定 UI 文案、导航、按钮与提示语。
- 新增全局 SSR 约束：诗歌脚本偏好以 `cookie` 为服务端真相源，`localStorage` 仅作客户端镜像，不允许单独决定首屏文案。
- 新增全局开发约束：开发阶段 Prisma schema 变更后禁止在业务代码中增加旧 runtime client 兼容分支，标准处理是重新生成 Prisma client 并重启 dev server。
- 新增全局图片 Prompt 约束：批量诗图生成必须保留 `诗名 + 作者 + 朝代 + 精简诗句摘录`，并用 `诗意场景 + 情绪氛围 + 画面主体 + 边框意象` 驱动环境，不允许使用固定花月窗景或强制中心留白模板覆盖所有诗作。
- 新增全局图片资产：366 首唐诗配图已通过 apimart (gpt-image-2) 全部生成并导入数据库。图片位于 `public/images/generated/`，`ImageAsset` 表 366 条记录全部为 `ready` 状态（style=`storybook-watercolor`，promptVersion=`v1`）。首页、详情页、复习卡片运行时图片不再回退占位图。
