# 任务：批量预生成 AI 讲解文本 + 讲解音频

## 背景

当前 AI 讲解是用户点击"加载 AI 讲解"按钮后实时调用 DeepSeek API 生成的，每次约 3-5 秒等待。
对于儿童用户，讲解内容有很多生字不认识，听音频比看文字更有帮助。

**目标：**

1. 用 DeepSeek 批量生成全部 325 首诗的 AI 讲解文本（child_v1 + general_v1），写入 DB 缓存
2. 用 StepFun TTS（音色 `linjiajiejie` 邻家姐姐）为讲解内容生成 MP3 文件存本地
3. 前端 AI 讲解卡片直接展示预生成的文本 + 提供播放按钮

## 当前架构

### AI 讲解

- **API 端点**: `app/api/ai/explain/route.ts` — POST 接收 `{ poetryId, audience }`
- **DeepSeek 调用**: `lib/ai/deepseek.ts` — `explainPoetry()` 使用 `deepseek-chat` 模型
- **Prompt 构建**: `lib/ai/prompts.ts` — `buildPoetryExplanationMessages()` 生成 system + user 消息
- **缓存**: `Poetry.aiExplanation` JSONB 字段，key 格式 `{audience}_{version}`（如 `child_v1`）
- **响应 schema**: `{ summary: string, imagery: string, emotion: string, cachedAt: string }`
- **前端组件**: `components/poetry/ai-explanation-card.tsx` — 点击加载 → 展示三个段落

### TTS 音频（诗歌朗读）

- **脚本**: `scripts/generate-tts-audio.py` — StepFun `stepaudio-2.5-tts` + edge-tts 回退
- **存储**: `public/audio/poetry/{sourceUid}.mp3`（370 个文件）
- **URL 解析**: `lib/audio.ts` — `getAudioUrl()` 和 `hasMappedAudioFile()`
- **播放器组件**: `components/audio/audio-control-bar.tsx` — immersive / review 两种变体
- **详情页播放器**: `components/poetry/immersive-poetry-stage.tsx`
- **复习页播放器**: `components/review/review-poetry-stage.tsx`

### 当前数据

- 诗歌总数：325 首（数据库）
- 已有 AI 讲解缓存：32 首（child_v1 + general_v1）
- 已有诗歌朗读音频：370 个 MP3 文件

## 实现计划

### Phase 1：批量生成讲解文本

**脚本**: `scripts/generate-ai-explanations.ts`（或 `.py`）

1. 从 DB 读取所有诗歌（id, title, author, lines, dynasty）
2. 对每首诗调用 `buildPoetryExplanationMessages()` 构建 prompt
3. 调用 DeepSeek API 获取讲解
4. 写入 `Poetry.aiExplanation` JSONB 字段（合并到已有的 cache key）
5. 支持断点续传：跳过已有 cache key 的诗歌
6. 支持 rate limiting：每批之间 sleep 避免 API 限流
7. 生成数量：325 首 × 2 版本 = 650 次 API 调用

**关键复用**:

- 直接复用 `lib/ai/prompts.ts` 的 `buildPoetryExplanationMessages()`
- 直接复用 `lib/ai/deepseek.ts` 的 `explainPoetry()` 或直接用 fetch 调用
- 使用 `.env.local` 中的 `DEEPSEEK_API_KEY`

### Phase 2：批量生成讲解音频

**脚本**: `scripts/generate-explain-audio.py`

1. 从 DB 读取所有已生成讲解的诗歌
2. 拼接讲解文本：`{summary}\n{imagery}\n{emotion}`
3. 调用 StepFun TTS `stepaudio-2.5-tts`，音色 `linjiajiejie`
4. 存储到 `public/audio/explain/{poetryId}_{audience}.mp3`
5. instruction 提示词：`"用邻家姐姐的亲切口吻为小朋友讲解唐诗，语速适中，温柔耐心"`
6. 支持断点续传：跳过已存在的 MP3 文件
7. 生成数量：最多 325 × 2 = 650 个 MP3

**StepFun API 调用模式**（复用现有 TTS 脚本的 client 模式）:

```python
client = OpenAI(api_key=api_key, base_url="https://api.stepfun.com/v1")
response = client.audio.speech.create(
    model="stepaudio-2.5-tts",
    voice="linjiajiejie",
    input=text,           # summary + imagery + emotion 拼接
    response_format="mp3",
    extra_body={
        "instruction": "用邻家姐姐的亲切口吻为小朋友讲解唐诗，语速适中，温柔耐心",
    },
)
```

### Phase 3：前端讲解卡片改造

**修改文件**: `components/poetry/ai-explanation-card.tsx`

1. 讲解文本从预加载（DB 已缓存）直接展示，无需点击加载
2. 如果 DB 有缓存，前端直接渲染文本（省去 API 调用）
3. 添加音频播放器：
   - 检测 `public/audio/explain/{poetryId}_{audience}.mp3` 是否存在
   - 存在则显示播放按钮，点击播放讲解音频
   - 可以复用 `AudioControlBar` 的简化版本
4. 切换 audience（儿童版/通用版）时同步切换音频

**音频检测**:

- 新增 `lib/audio.ts` 中的 `getExplainAudioUrl(poetryId, audience)` 函数
- 返回 `/audio/explain/{poetryId}_{audience}.mp3`
- 前端通过 `<audio>` 元素的 `canplay` 事件或 fetch HEAD 判断是否存在

### Phase 4：服务端渲染优化

**修改文件**: `app/poetry/[id]/page.tsx` + `lib/poetry/repository.ts`

1. 在诗歌详情页的 server component 中直接读取 `Poetry.aiExplanation`
2. 将已缓存的讲解作为 props 传给客户端组件
3. 如果有缓存，前端组件直接展示，无需 API 调用
4. 如果无缓存（理论上批量生成后不会出现），保留现有的 API 调用流程作为回退

## 目录结构（新增）

```
public/audio/explain/          # 讲解音频（gitignore）
  ts300-0001_child.mp3         # 儿童版讲解
  ts300-0001_general.mp3       # 通用版讲解
  ...
scripts/
  generate-ai-explanations.ts  # 批量生成讲解文本
  generate-explain-audio.py    # 批量生成讲解音频
```

## 注意事项

1. **API 成本**：DeepSeek 650 次调用 + StepFun 650 次调用，需注意额度
2. **断点续传**：两个脚本都必须支持跳过已完成的项，方便分批执行
3. **Rate limiting**：建议每批 10-20 首后 sleep 2-3 秒
4. **文本长度**：讲解文本拼接后可能超过 StepFun 950 字符限制，需分段或截断
5. **gitignore**：`public/audio/explain/` 需加入 `.gitignore`（同 poetry 音频）
6. **回退兼容**：保留现有 API 调用流程，确保无缓存时仍可实时生成
7. **讲解音频与诗歌朗读音频**：两者是独立的，诗歌朗读音频已有 370 个，讲解音频是新增的
