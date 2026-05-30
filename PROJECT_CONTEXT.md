## 2026-05-29

- 新增全局数据流：`LearningRecord.eventType = "view_poetry"` 会初始化或重置 `ReviewState` 的首次复习入池时间。
- 新增全局数据流：`challenge_correct` / `challenge_wrong` 会驱动 `ReviewState` 的固定间隔推进、答错重置和连续三错当日强制复习。
- 一期复习规则已固化在 `lib/review/scheduler.ts`，间隔序列固定为 `1 -> 2 -> 4 -> 7 -> 15 -> 30` 天。
- 新增全局 AI 数据流：`POST /api/ai/explain` 先查 `Poetry.aiExplanation[audience_promptVersion]`，未命中才调用 DeepSeek 并回写缓存。
- 新增全局约束：AI 讲解缓存 key 固定为 `{audience}_{promptVersion}`，一期只允许 `child_v1` 与 `general_v1`。
