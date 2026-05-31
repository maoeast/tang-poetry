# 唐诗画境诗歌内容简繁双源与切换实现规格

**目标：** 修正现有唐诗主数据中由自动繁简转换带来的标题、作者与正文偏差，建立「简体权威源 + 繁体权威源」的双文本数据模型，并实现只作用于诗歌内容本身的简繁切换能力。

**当前日期：** 2026-05-31

**适用范围：**

- 唐诗主数据导入链路
- `Poetry` 数据模型与读取层
- 首页今日一诗、详情页、复习页、挑战页中的诗歌内容展示
- 简繁偏好在 SSR 与客户端之间的一致性处理

**明确不在范围内：**

- 页面固定 UI 文案的多语言或简繁切换
- 音频资源命名与 `sourceUid` 映射方案重做
- 诗歌以外的图片、徽章、按钮、导航文本切换

---

## 1. 设计目标

本次改造需要同时满足以下目标：

- 用经过人工审核的 `data/ts300.simple.json` 作为简体展示权威源
- 用 `data/ts300.raw.json` 作为繁体展示权威源
- 不再依赖运行时 OpenCC 转换生成展示文本
- 避免因数据切换破坏现有 `poetryId`、`sourceUid`、音频与学习记录链路
- 简繁切换只影响题目、作者、正文，不影响页面固定文案
- 首屏 SSR 与客户端 hydration 必须稳定一致，不允许出现简繁闪烁或 hydration mismatch

---

## 2. 核心结论

### 2.1 双权威源是唯一可信方案

古诗词场景中的繁简差异不只是字形映射，还包含：

- 版本差异
- 异体字选择
- 题目校勘
- 人工审核后的定稿修正

因此，本系统禁止使用「繁体原文 + OpenCC 运行时转换」作为展示真相源。

系统必须同时保留两套权威文本：

- 简体权威源：`data/ts300.simple.json`
- 繁体权威源：`data/ts300.raw.json`

### 2.2 简繁切换只作用于诗歌内容

本次切换范围仅包括：

- 诗题
- 作者
- 正文

本次切换不包括：

- 「今日一诗」「去挑战这首诗」「已读」「播放」等固定 UI 文案
- 角标、按钮、导航、提示语

### 2.3 SSR 真相源是 cookie，不是 localStorage

为保证服务端首屏与客户端 hydration 一致，必须采用以下铁律：

> `cookie` 负责 SSR 一致性，`localStorage` 负责客户端镜像，不允许 `localStorage` 单独决定首屏文案。

实现含义如下：

- 服务端只读取 `cookie` 决定首屏显示的诗歌内容版本
- 客户端首次渲染必须使用服务端下发的初始偏好值
- `localStorage` 不允许在首次 render 时覆盖服务端结果
- 用户切换偏好时，`cookie` 与 `localStorage` 双写
- 若两者冲突，以 `cookie` 为准，并回写覆盖 `localStorage`

---

## 3. 数据源策略

### 3.1 数据源职责

#### `data/ts300.simple.json`

职责：

- 提供简体展示文本
- 提供人工审核后的题目、作者与正文定稿

#### `data/ts300.raw.json`

职责：

- 提供繁体展示文本
- 保留原始繁体版本的题目、作者与正文

### 3.2 合并规则

导入脚本必须将两份 JSON 按同一首诗合并为一条统一记录。

判定同一首诗的依据必须同时满足：

- 数组长度一致
- 相同索引位置的 UUID 一致
- 相同索引位置的诗歌逻辑顺序一致

只要有任一项不满足，导入必须失败，不允许静默跳过或自动纠偏。

### 3.3 导入失败规则

以下情况均属于硬失败：

- 两个文件条目总数不一致
- 同一索引的 `id` 不一致
- 任一条目缺失 `title`、`author` 或 `paragraphs`
- 数据类型不符合预期

失败时导入脚本必须：

- 输出明确错误信息
- 中止写库
- 不留下部分写入状态

---

## 4. 数据模型设计

### 4.1 `Poetry` 的文本字段

`Poetry` 需要增加显式的双文本字段：

- `titleZhHans`
- `titleZhHant`
- `authorZhHans`
- `authorZhHant`
- `linesZhHans`
- `linesZhHant`

其中：

- `titleZhHans`、`authorZhHans`、`linesZhHans` 来自 `ts300.simple.json`
- `titleZhHant`、`authorZhHant`、`linesZhHant` 来自 `ts300.raw.json`

### 4.2 兼容字段策略

现有字段：

- `title`
- `titleOriginal`
- `author`
- `authorOriginal`
- `lines`

本阶段不立即删除，作为兼容层保留。

兼容期内建议约定如下：

- `title` = `titleZhHans`
- `author` = `authorZhHans`
- `lines` = `linesZhHans`
- `titleOriginal` = `titleZhHant`
- `authorOriginal` = `authorZhHant`

这样可以在不立即重写所有调用点的情况下完成平滑迁移。

### 4.3 非文本字段保持不变

以下字段和语义保持不变：

- `id`
- `sourceId`
- `sourceUid`
- `tags`
- `themes`
- `difficulty`
- `imageKey`
- `imageStatus`
- `audioMeta`

简繁切换不允许影响这些字段的行为。

---

## 5. 导入链路设计

### 5.1 导入脚本职责

`scripts/import-ts300.ts` 的新职责如下：

1. 读取 `ts300.simple.json`
2. 读取 `ts300.raw.json`
3. 校验两份文件是否可以一一对应
4. 组装统一的归一化数据结构
5. 写入 `data/poetries.normalized.json`
6. 回填或更新数据库中的 `Poetry`
7. 继续保留现有 `dailySeeds` 写入逻辑

### 5.2 归一化输出结构

归一化后的中间数据应显式包含：

- `titleZhHans`
- `titleZhHant`
- `authorZhHans`
- `authorZhHant`
- `linesZhHans`
- `linesZhHant`

同时保留：

- `id`
- `sourceId`
- `sourceUid`
- `tags`
- `themes`
- `difficulty`

### 5.3 运行时 OpenCC 的角色变化

`lib/poetry/normalize.ts` 中现有基于 OpenCC 的自动转换逻辑，不再承担展示文本生成职责。

允许保留 OpenCC 的场景仅限于：

- 历史兼容过渡
- 校验辅助
- 未来离线数据工具

不允许用于最终用户看到的简体或繁体诗歌正文生成。

---

## 6. 运行时读取层设计

### 6.1 增加内容变体读取层

需要新增一个薄的内容变体读取层，例如：

- `lib/poetry/content-variant.ts`

职责是：

- 输入 `Poetry` 记录与当前脚本偏好
- 输出统一结构的展示文案

输出结构示例：

```ts
type PoetryContentVariant = {
  title: string;
  author: string;
  lines: string[];
  script: "zh-Hans" | "zh-Hant";
};
```

### 6.2 页面组件的契约保持稳定

页面组件不应直接处理：

- `titleZhHans`
- `titleZhHant`
- `linesZhHans`
- `linesZhHant`

页面组件只消费读取层已经选好的展示版本。

这样可以保证：

- `LyricsWindow`
- `PosterTitleBlock`
- `ImmersivePoetryStage`
- `ReviewPoetryStage`

继续保持纯展示职责，不承担脚本切换逻辑。

### 6.3 仓库层职责

`lib/poetry/repository.ts` 与其他诗歌查询层需要扩展：

- 查询两套文本字段
- 接收当前脚本偏好
- 返回已裁剪好的展示版本

仓库层输出给页面的数据结构中，应继续保留统一字段名：

- `title`
- `author`
- `lines`

但这些字段的值由当前偏好决定。

---

## 7. 偏好存储与 SSR 一致性设计

### 7.1 偏好标识

脚本偏好值只允许以下两种：

- `zh-Hans`
- `zh-Hant`

默认值：

- `zh-Hans`

### 7.2 服务端读取规则

服务端首屏渲染必须从 `cookie` 中读取偏好，例如：

- `poetry-script=zh-Hans`
- `poetry-script=zh-Hant`

无 cookie 时：

- 默认简体

非法值时：

- 视为无效
- 回退到 `zh-Hans`

### 7.3 客户端初始化规则

客户端组件首次 render 必须使用服务端传下来的 `initialScript`。

禁止以下写法：

- 首次 render 直接读取 `localStorage`
- mount 后立即无条件以 `localStorage` 覆盖服务端状态
- 使用 `Math.random()`、`Date.now()` 之类不稳定值决定初始脚本

### 7.4 用户切换行为

用户点击切换后：

1. 更新当前页面的客户端 state
2. 写入 `cookie`
3. 写入 `localStorage`

这样：

- 当前页可以即时切换
- 后续 SSR 请求可以保持一致
- 客户端镜像状态可持续

### 7.5 冲突修正规则

若出现：

- `cookie=zh-Hans`
- `localStorage=zh-Hant`

则以 `cookie` 为准。

客户端 mount 后应将 `localStorage` 修正为 `cookie` 对应值，避免长期漂移。

### 7.6 禁止使用的补丁式方案

以下方案明确禁止作为正式解法：

- `suppressHydrationWarning`
- 首屏先渲染简体、再闪切成繁体
- 依赖浏览器扩展或用户代理推断首选脚本
- 将 `localStorage` 作为首屏唯一真相源

---

## 8. 交互设计

### 8.1 切换控件范围

切换控件只出现在与诗歌阅读直接相关的场景：

- 首页今日一诗
- `/poetry/[id]`
- `/review/[id]`
- `/review`
- `/challenge` 中展示诗歌题干的区域

### 8.2 切换控件行为

控件只改变：

- 诗题
- 作者
- 正文

控件不改变：

- 导航
- 按钮文字
- 徽章
- 提示文案
- 页面标题栏

### 8.3 视觉与布局要求

切换控件应保持低侵入性：

- 默认简洁
- 不喧宾夺主
- 不破坏现有竖版诗画与歌词窗主结构

推荐使用：

- 分段开关
- 双态 pill
- 「简｜繁」紧凑切换钮

---

## 9. 页面影响范围

### 9.1 首页

受影响内容：

- 今日诗题
- 作者
- 海报正文预览

不受影响内容：

- 「今日一诗」
- CTA 文案
- 已读角标

### 9.2 详情页

受影响内容：

- 海报标题
- 作者
- 歌词窗正文

不受影响内容：

- 播放器控件文案
- AI 讲解区固定标签
- 译文区固定标题

### 9.3 复习页

受影响内容：

- 复习卡标题
- 作者
- 复习播放器中的诗句正文

不受影响内容：

- 「今日到期」「最近错题」等分组标题

### 9.4 挑战页

受影响内容：

- 题面里展示的诗歌标题
- 题面里展示的作者
- 补句或排序题中的诗句正文

不受影响内容：

- 「下面哪一个是这首诗的题目」
- 「这首诗是谁写的」
- 结果页固定提示

---

## 10. 迁移策略

### 10.1 分阶段迁移

建议按以下顺序推进：

1. 先扩展 Prisma 字段
2. 再升级导入脚本为双源导入
3. 执行数据回填
4. 扩展仓库层读取逻辑
5. 最后接入前端切换控件

### 10.2 兼容期要求

在页面全部切换完成之前：

- 旧页面仍可继续使用 `title/author/lines`
- 新页面或新读取层优先使用 `ZhHans/ZhHant`

兼容期结束后，可评估是否清理旧字段依赖。

---

## 11. 测试与验收

### 11.1 数据导入测试

必须覆盖：

- `simple/raw` 长度一致时可成功导入
- UUID 不一致时导入失败
- 缺字段时导入失败
- 首条诗歌标题以 `在狱咏蝉` 进入简体字段，而不是 `在岳咏蝉`

### 11.2 读取层测试

必须覆盖：

- 默认返回简体内容
- 切换到繁体后返回繁体题目、作者、正文
- 旧兼容字段与新字段在过渡期保持预期映射

### 11.3 SSR 一致性测试

必须覆盖：

- 无 cookie 时首屏为简体
- `cookie=zh-Hant` 时首屏为繁体
- hydration 前后显示内容一致
- `cookie` 与 `localStorage` 冲突时以 `cookie` 为准

### 11.4 页面行为测试

必须覆盖：

- 切换后诗歌内容变化
- 页面固定 UI 文案不变化
- 音频、挑战、复习、首页 CTA 链路不受影响

---

## 12. 风险与约束

### 12.1 数据顺序耦合风险

双源导入当前依赖：

- 相同顺序
- 相同 UUID

若未来任一源文件被重新排序，导入会失败。因此必须把「顺序一致性」作为数据维护约束写入项目文档。

### 12.2 旧字段误用风险

如果后续页面继续直接读取：

- `titleOriginal`
- `authorOriginal`

会出现简繁职责不清的问题。

因此新页面逻辑必须统一走内容变体读取层。

### 12.3 UI 范围蔓延风险

本次项目只做诗歌内容切换。如果后续临时把固定文案也并入切换，会迅速演变为全站 i18n 工程，范围将显著扩大。

因此必须坚持本规格边界：

> 只切诗歌内容，不切固定 UI 文案。

---

## 13. 最终决策摘要

本次方案最终采用：

- 双权威源：`ts300.simple.json` + `ts300.raw.json`
- 双文本字段：显式存储简体与繁体题目、作者、正文
- 内容变体读取层：页面只消费当前展示版文案
- 偏好双写：`cookie` + `localStorage`
- SSR 以 `cookie` 为真相源
- 切换范围仅限诗歌内容本身

本次方案明确不采用：

- 运行时 OpenCC 自动生成展示文案
- `localStorage` 决定首屏脚本
- `suppressHydrationWarning` 式补丁
- 页面固定 UI 文案同步简繁化
