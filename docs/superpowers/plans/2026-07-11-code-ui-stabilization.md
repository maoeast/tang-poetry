# Code and UI Stabilization Plan

> **面向 AI 代理的工作者：** 此计划来自一次 `/check` 代码审查和 `/ui` 当前渲染检查。步骤使用复选框（`- [ ]`）语法跟踪进度。实施前先确认工作树状态，实施后必须重新运行验证命令。

**目标：** 修复当前主线的构建失败、单元测试失败、移动端首屏布局问题和浏览页首屏图片 LCP 警告。

**非目标：** 不修改 Prisma schema，不新增数据库迁移，不重做整站视觉风格，不改变运行时图片资产真源，不改复习页结构。

**架构：** 本轮只做局部稳定性修复。代码侧以现有事实为准，图片资产版本继续保持 `storybook-watercolor` / `v1`。UI 侧沿用当前新中式极简视觉，只调整响应式布局、宽度约束和首屏图片优先级。

**技术栈：** Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4、node:test、Python TTS 脚本。

**硬约束：**
- 遵守 `AGENTS.md`，不为 stale Prisma runtime client 增加业务兼容分支。
- 简繁切换仍只作用于诗题、作者和正文，不改固定 UI 文案。
- `ImageAsset` 仍是运行时图片唯一数据源，缺图只回退 `/images/placeholders/default-poetry-card.jpg`。

---

## 任务 1：修复生产构建阻断

**文件：**
- 修改：`lib/poetry/guwendao-annotation-import.ts`

- [x] 合并 `TITLE_ALIASES` 中重复的 `"无题·凤尾香罗薄几重"` key。
- [x] 保留完整 alias 集合：`"无题"`、`"无题二首 一"`、`"无题·凤尾香罗薄几重"`。
- [x] 运行 `npm run build`，确认不再因 duplicate object key 失败。

**验收：** TypeScript 不再报 `An object literal cannot have multiple properties with the same name`。

---

## 任务 2：修复图片生成测试版本漂移

**文件：**
- 修改：`tests/scripts/prepare-image-generation.test.ts`

- [x] 将 `buildImageAssetRecord creates placeholder import records before generation` 的 `promptVersion` 期望值从 `v2` 改为 `v1`。
- [x] 不修改 `scripts/prepare-image-generation.ts` 的 `PROMPT_VERSION`，因为当前文档和运行数据都声明图片资产为 `storybook-watercolor` / `v1`。
- [x] 运行 `npm test`，确认该测试不再失败。

**验收：** 图片资产测试与当前资产事实一致，不引入虚假的 `v2` 版本语义。

---

## 任务 3：修复 TTS 脚本测试依赖问题

**文件：**
- 修改：`scripts/generate-tts-audio.py`
- 创建：`scripts/requirements-tts.txt`
- 修改：`README.md`

- [x] 将 `edge_tts` 和 `openai` 从顶层 import 移到实际 provider 使用处。
- [x] 保持 `build_speech_request()` 可在未安装 TTS 依赖时被导入和测试。
- [x] 在 StepFun provider 路径内导入 `OpenAI`，缺依赖时抛出面向开发者的明确错误。
- [x] 在 edge-tts fallback 路径内导入 `edge_tts`，缺依赖时抛出面向开发者的明确错误。
- [x] 新增 `scripts/requirements-tts.txt`，列出离线 TTS 脚本需要的 Python 依赖：`edge-tts`、`openai`。
- [x] 在 README 音频资产管理小节补充安装命令：`python -m pip install -r scripts/requirements-tts.txt`。
- [x] 运行 `npm test`，确认 TTS payload 测试不再因 `ModuleNotFoundError: No module named 'edge_tts'` 失败。

**验收：** 纯函数测试不依赖离线 TTS 环境，真正执行音频生成时仍能清晰提示缺少 Python 包。

---

## 任务 4：修复首页移动端搜索框裁切

**文件：**
- 修改：`app/page.tsx`
- 修改：`components/browse/search-input.tsx`

- [x] 给 `SearchInput` 增加可选 `className` 参数，默认宽度改为适合容器的 `w-full sm:w-80`。
- [x] 首页 header 在移动端改为两行布局：标题和副标题一组，搜索框和头像入口一组。
- [x] 保持桌面端当前横向视觉和间距，不改变首页主视觉结构。
- [x] 用 375px 移动端截图确认搜索框不再被右侧裁切。

**验收：** 375px 下首页首屏搜索框完整显示，头像入口不挤压输入框。

---

## 任务 5：修复浏览页移动端 sticky bar 挤压

**文件：**
- 修改：`app/browse/page.tsx`
- 修改：`components/browse/sticky-category-nav.tsx`
- 可能修改：`components/browse/search-input.tsx`

- [x] 浏览页 sticky bar 在移动端改为纵向两行：分类导航一行，搜索框一行。
- [x] 桌面端保持分类导航左侧、搜索框右侧的同排布局。
- [x] 将 `StickyCategoryNav` 的 `scrollbar-none` 改为项目已有的 `scrollbar-hide`。
- [x] 给分类导航容器补 `min-w-0` 和横向滚动约束，避免分类文字被挤成竖排。
- [x] 用 375px 移动端截图确认分类导航可横向滚动，搜索框完整显示。

**验收：** `/browse` 移动端不再出现分类标签窄列竖排，首屏结构稳定。

---

## 任务 6：修复我的页诗人缘分姓名换行

**文件：**
- 修改：`components/me/profile-summary.tsx`

- [x] 在诗人缘分列表项中防止姓名逐字换行。
- [x] 窄屏布局改为头像和姓名占左侧，进度条和计数保持右侧或下移，避免相互挤压。
- [x] 桌面端保持当前信息密度和卡片结构。
- [x] 用 375px 移动端截图确认姓名完整成词显示。

**验收：** `/me` 移动端诗人姓名不再逐字竖排，进度条不遮挡姓名和计数。

---

## 任务 7：处理浏览页首屏图片 LCP 警告

**文件：**
- 修改：`components/browse/poetry-card.tsx`
- 修改：`components/browse/category-section.tsx`
- 修改：`app/browse/page.tsx`

- [x] 给 `PoetryCard` 增加可选 `priority` 参数，并传给 `next/image`。
- [x] 浏览页非搜索模式只给第一屏前 4 张诗卡传 `priority`。
- [x] 搜索结果模式只给结果列表前 4 张诗卡传 `priority`。
- [x] 不对全列表启用 eager，避免长列表图片抢占网络。
- [x] 用 Playwright 或浏览器控制台确认首屏 LCP 图片警告消失或明显减少。

**验收：** 首屏图片加载优先级更准确，长列表仍保持懒加载。

---

## 验证清单

- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`
- [x] 启动 `npm run dev`。
- [x] 用 Playwright 截图检查 `/`、`/browse`、`/me` 的桌面首屏。
- [x] 用 Playwright 截图检查 `/`、`/browse`、`/me` 的 375px 移动端首屏。
- [x] 手动确认首页搜索框不裁切。
- [x] 手动确认浏览页分类导航不被挤成竖排。
- [x] 手动确认我的页诗人姓名不逐字换行。
- [x] 手动确认浏览页首屏图片没有明显 LCP 优先级警告。

---

## 回滚策略

- 代码和 UI 调整都只改源码和文档，不改数据库和外部状态。
- 若某个 UI 修复引入桌面端回归，优先回滚对应组件的响应式 class，不影响其他任务。
- 若 TTS lazy import 影响真实生成脚本，回滚 `scripts/generate-tts-audio.py` 并保留 `requirements-tts.txt` 文档说明，随后单独修脚本入口。

---

## 主要风险

- `promptVersion = v1` 的判断依赖当前文档和数据库事实。如果后续确认存在未完成的 `v2` 图片批次，任务 2 应改为升级 `PROMPT_VERSION`、同步导入脚本、文档和测试，而不是只改测试。
- `SearchInput` 被多个页面复用，改默认宽度前要检查首页、浏览页和 Suspense fallback 的宽度一致性。
- 浏览页列表很长，图片 priority 只应覆盖首屏少量卡片，不能扩大到全部卡片。
