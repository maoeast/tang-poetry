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

- AI 讲解接口仍未打通本地可用配置，当前缺 `DEEPSEEK_API_KEY`
- 还没有完成挑战页真实作答提交流程，所以 `ChallengeAttempt` / `challenge_correct|wrong` 写库仍未实证
- 还没有把 AI 讲解、挑战写库、复习入池这三条联动链路完整串测一遍
- 还没有验证在 `SYSTEM_USER_ID` 缺失时各页面的降级表现是否符合预期
- 还没有补齐本轮联调截图

### 内容与体验缺口

- 译文和拼音仍有占位内容，尚未系统补录
- 复习页“开始复习”仍先跳详情页/挑战页串联，尚未形成专用复习流程
- 二期主题切换与更多视觉风格仍停留在预留状态
- 音频体验仍缺少二期层面的完整节奏设计与无障碍细化

## 建议执行顺序

1. 先补本地 `DEEPSEEK_API_KEY`，重新验证 `/api/ai/explain` 的成功返回与缓存回写。
2. 再用真实浏览器完成一轮 `/challenge` 作答，核对 `ChallengeAttempt`、`LearningRecord`、`ReviewState` 三表联动。
3. 单独验证移除 `SYSTEM_USER_ID` 后 `/review`、`/me` 等页面的降级表现。
