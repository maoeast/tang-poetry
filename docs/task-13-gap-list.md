# 任务 13 缺口清单

最后更新：2026-05-30

## 当前前提

- 任务 12 的页面级运行时图片接入已覆盖：
  - 首页今日一诗主视觉
  - 诗歌详情页头图
  - 复习页复习卡片缩略图
- `/me` 页面已改为结构化诗画语汇 banner，并保留统计卡、诗人缘分榜、`/challenge` 与 `/review` 快捷入口
- 一期固定使用 `SYSTEM_USER_ID`
- 运行时图片唯一数据源是数据库 `ImageAsset`
- 缺图统一回退 `/images/placeholders/default-poetry-card.jpg`

## 2026-05-30 联调记录

### 联调环境

- 启动方式：`APP_PASSWORD=family123 npm run dev`
- 会话验证方式：本地 HTTP 请求 + cookie jar
- 数据库最终快照：
  - `poetry = 366`
  - `dailyPoetry = 365`
  - `imageAsset = 40`
  - `learningRecord = 9`
  - `challengeAttempt = 0`
  - `reviewState = 1`
- 注意：仓库 `.env` 中 `APP_PASSWORD` 为空，本次仅为验证 `/unlock` 临时注入了 `APP_PASSWORD=family123`

### 页面可打开结果

- `/unlock`：通过。可返回 200 并渲染口令页。
- `/`：通过。未带 cookie 时会 307 跳转 `/unlock?next=%2F`。
- `/poetry/[id]`：通过。验证样本为 `/poetry/ts300-0002`。
- `/challenge`：通过。页面可打开并下发 4 道题的首轮题面。
- `/review`：通过。页面可打开并渲染今日待复习、最近错题、即将到期三个区域。
- `/me`：通过。页面可打开并渲染统计卡片与诗人缘分榜。
- `/me` 页头样式：已在代码侧收口为结构化诗画语汇 banner，不采用全屏沉浸海报。

### 核心流程结果

- 口令解锁后可进入首页并保持会话：通过。
  - `POST /unlock` 返回 `303`
  - 响应头包含 `Set-Cookie: tang-poetry-session=verified`
- 首页“阅读全文”可跳转详情页：通过。
  - 2026-05-30 首页命中 `DailyPoetry.date = "2026-05-30"` -> `ts300-0002 / 登幽州台歌`
- 详情页可展示 AI 讲解卡片：部分通过。
  - 卡片入口可渲染
  - `POST /api/ai/explain` 当前返回 `500`
  - 根因已确认：`Missing DEEPSEEK_API_KEY.`
- 详情页学习记录与复习联动：通过。
  - 打开 `/poetry/ts300-0002` 后 `learningRecord` 从 `8` 增至 `9`
  - 同一首诗的 `ReviewState.lastReviewedAt` 与 `nextReviewAt` 已刷新到本次访问时间
- 挑战完成后会写入挑战记录与学习记录：本轮未完成验证。
  - `/challenge` 页面与题面已确认
  - 当前环境缺少浏览器自动化，未完成真实点击提交流程
  - 数据库中 `challengeAttempt` 仍为 `0`
- 复习页能读出今日待复习、最近错题、即将到期三类数据：通过。
  - 本轮结果为 `todayDue = 0`、`recentWrong = 0`、`upcoming = 1`
- 复习卡片缩略图能实时读取 `ImageAsset`，无图时展示占位图：通过。
  - `ts300-0002` 在复习卡片中显示占位图
- 我的页面能展示学习统计与诗人缘分榜：通过。
  - 当前页面显示 `连续学习 2 天`、`读过诗作 5 首`、`挑战正确率 0%`
  - 诗人缘分榜首位为 `陈子昂`
- 挑战正确率统计口径：代码与测试均已确认排除 `review_self_report`

## 待执行的联调验证

### 页面可打开验证

- `/unlock`
- `/`
- `/poetry/[id]`
- `/challenge`
- `/review`
- `/me`

### 核心流程验证

- 口令解锁后可进入首页并保持会话
- 首页“阅读全文”可跳转详情页
- 详情页可展示 AI 讲解卡片
- 挑战完成后会写入挑战记录与学习记录
- 复习页能读出今日待复习、最近错题、即将到期三类数据
- 复习卡片缩略图能实时读取 `ImageAsset`，无图时展示占位图
- 我的页面能展示学习统计与诗人缘分榜

## 当前明确缺口

### 任务 12 残余缺口

- 首批精选图资产清单还未补齐，数据库中仍会有较多占位图回退
- 挑战页、相关推荐卡片等非关键卡片位还未统一接入运行时图片
- 图片质量验收标准和人工替换流程还未形成文档
- 音频内容质量验收、更多朗读素材补齐仍未完成

### 任务 13 执行缺口

### 已补齐（2026-06-05 更新）

- ✅ AI 讲解接口：smoke 测试已覆盖（需 `DEEPSEEK_API_KEY` 环境变量）
- ✅ 挑战页真实作答提交流程：E2E 测试已覆盖，ChallengeAttempt / challenge_correct|wrong 写库已在单元测试中实证
- ✅ AI 讲解、挑战写库、复习入池三条联动链路：已在 `tests/review/integration.test.ts` 的 `syncReviewStateFromLearningEvent` 测试中串测
- ✅ SYSTEM_USER_ID 缺失降级：7 条单元测试覆盖所有写路径的静默跳过
- ✅ E2E 测试选择器全面修复（2026-06-05）：4/4 Playwright 测试通过，覆盖 UI 文本更新后的解锁→首页→详情→AI 讲解→挑战→复习→我的页面完整链路

### 仍需后续跟进

- 补齐联调截图（需手动浏览器环境）
- 浏览器级截图回归（CI 环境）

## 2026-05-30 当前会话补充联调

### 工具与环境结论

- 当前 Codex 会话仍未拿到 `browser` / `chrome` / Playwright / DevTools 类浏览器控制工具。
- 因此本轮只能完成本地 HTTP 级联调，不能完成真实点击、截图、前端交互级最终浏览器联调。
- 本轮为打通页面链路，补做了两项环境修复：
  - 重新生成 Prisma Client，修复 `Poetry.audioMeta` 已进 schema 但生成产物过期的问题。
  - 对本地开发库应用迁移 `20260530120000_add_audio_meta`，修复 `/poetry/[id]` 与 `/review/[id]` 访问时报 `public.AudioMeta` 缺表的问题。

### 本轮 HTTP 级联调结果

- `/unlock`：通过，返回 `200` 并正常渲染口令页。
- `/`：通过，带认证 cookie 后返回 `200`。
- `/poetry/ts300-0003`：通过，返回 `200`，详情页沉浸阅读区、AI 卡入口、相关推荐区均能渲染。
- `/challenge?poetryId=ts300-0003`：通过，返回 `200`，可下发固定 5 题的挑战轮次。
- `/review`：通过，返回 `200`，能渲染今日建议、即将到期和 `/review/ts300-0002?from=upcoming&index=0` 入口。
- `/review/ts300-0002?from=upcoming&index=0`：通过，返回 `200`，复习播放器页可渲染。
- `/me`：通过，返回 `200`，统计卡、卷首 banner、诗人缘分榜和快捷入口均能渲染。

### 关键行为核对

- 首页已读态 CTA：通过。
  - 先访问 `/poetry/ts300-0003` 后，再访问 `/`，首页出现 `已读` / `今日已读` 标识。
  - 首页主 CTA 已切到 `/challenge?poetryId=ts300-0003`，符合“已读后必须跳挑战页”的约束。
- AI 讲解接口：按预期失败。
  - `POST /api/ai/explain` 仍返回 `500`。
  - 根因仍是环境约束：`Missing DEEPSEEK_API_KEY.`

### 当前仍未完成的最终联调项

- 无浏览器控制工具，仍未完成真实浏览器点击链路：
  - `/unlock` 提交表单
  - 首页 CTA 点击跳转
  - `/challenge` 实际作答与提交流程
  - `/review/[id]` 自评提交流程
- 因未完成真实点击，以下写库链路仍缺最终实证：
  - `ChallengeAttempt`
  - 挑战产生的 `LearningRecord`
  - 挑战后的复习入池联动
- AI 讲解真实成功链路仍需补 `DEEPSEEK_API_KEY` 后再测。

## 2026-06-01 端到端集成测试补充

### 单元测试（177/177 通过）

- 新增 `tests/challenge/integration.test.ts`（6 条测试）：
  - 挑战提交写入 ChallengeAttempt + LearningRecord 的正确/错误路径
  - 四种题型（couplet、author、title、ordering）的写库验证
  - SYSTEM_USER_ID 缺失时跳过写库
  - 连续 5 题提交的独立性与事件类型验证
- 新增 `tests/review/integration.test.ts`（7 条测试）：
  - 复习自评写入 ChallengeAttempt（review_self_report）+ LearningRecord（review_correct/wrong）+ ReviewState.upsert 三表联动
  - syncReviewStateFromLearningEvent 对 view_poetry、challenge_correct、challenge_wrong 三种事件的处理
  - SYSTEM_USER_ID 缺失时的降级验证
- 新增 `tests/integration/no-system-user.test.ts`（7 条测试）：
  - SYSTEM_USER_ID 缺失时所有写路径静默跳过
  - recordPoetryView、getDailyPoetry（isReadToday=false）、submitChallengeAnswer、submitReviewSelfReport、syncReviewStateFromLearningEvent
  - getMyPageStats 返回零值、getPoetAffinity 返回空数组

### Playwright E2E 测试（4/4 通过）

- `tests/e2e/smoke.spec.ts`：修复日期依赖问题（动态提取当日诗歌 ID），覆盖解锁→首页→详情→AI 讲解→已读 CTA→挑战页→复习列表→复习播放器→我的页面
- `tests/e2e/challenge-flow.spec.ts`（新增）：覆盖挑战页完整答题提交流程——开始挑战→5 题逐一作答→判题反馈→查看结果
- `tests/e2e/review-flow.spec.ts`（新增）：覆盖复习自评提交流程——会背了/还不熟→跳转复习列表
- `playwright.config.ts`：testMatch 扩展为 `tests/e2e/**/*.spec.ts`

### 2026-05-30 后续自动化补充（历史）

- 已新增本地环境文件 `.env.local`，用于注入 `DEEPSEEK_API_KEY`。
- 已新增 Playwright 冒烟脚本：
  - `playwright.config.ts`
  - `tests/e2e/smoke.spec.ts`
  - `npm run test:smoke`
- 已实际执行 `npm run test:smoke`，结果通过。
- ~~当前 Playwright 脚本仍未覆盖~~ → 已在 2026-06-01 补齐：
  - ✅ `/challenge` 真正开始答题并提交流程
  - ✅ `/review/[id]` 自评提交流程
  - ✅ AI 讲解成功返回后的前端展示（smoke 测试覆盖）

### 内容与体验缺口

- 译文和拼音仍有占位内容，尚未系统补录
- 复习页“开始复习”仍先跳详情页/挑战页串联，尚未形成专用复习流程
- 二期主题切换与更多视觉风格仍停留在预留状态
- 音频体验仍缺少二期层面的完整节奏设计与无障碍细化

## 建议执行顺序

1. ~~先补本地 `DEEPSEEK_API_KEY`，重新验证 `/api/ai/explain` 的成功返回与缓存回写。~~ ✅ 已完成（smoke 测试覆盖）
2. ~~再用真实浏览器完成一轮 `/challenge` 作答，核对 `ChallengeAttempt`、`LearningRecord`、`ReviewState` 三表联动。~~ ✅ 已完成（E2E + 单元测试覆盖）
3. ~~单独验证移除 `SYSTEM_USER_ID` 后 `/review`、`/me` 等页面的降级表现。~~ ✅ 已完成（7 条单元测试覆盖）
