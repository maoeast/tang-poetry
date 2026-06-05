# 设计规格：批量预生成 AI 讲解文本 + 讲解音频

## 概述

批量预生成 325 首唐诗的 AI 讲解文本（child_v1 + general_v1）并写入 DB，再为讲解文本生成 TTS 音频文件。

## 当前状态

- 325 首诗，32 首已有 AI 讲解缓存
- 讲解存储在 `Poetry.aiExplanation` JSONB 字段，key 格式 `{audience}_v1`
- 现有 `explainPoetry()` 封装了完整的 DeepSeek API 调用逻辑

## Phase 1：批量生成讲解文本

### 方案

**复用 `explainPoetry()` + 外层重试循环**（方案 A）

- 导入 `lib/ai/deepseek.ts` 的 `explainPoetry()` 函数
- 导入 `lib/ai/prompts.ts` 的 `getExplanationCacheKey()`
- 用 `PrismaClient` 直连 DB，跟 `generate-pinyin.ts` 风格一致
- 通过 `dotenv` 加载 `.env.local`

### 脚本：`scripts/generate-ai-explanations.ts`

#### CLI 参数

| 参数 | 默认值 | 说明 |
|---|---|---|
| `--write` | false | 不带则 dry run |
| `--rate-limit` | 2000 | 每首诗之间等待 ms |
| `--id` | 无 | 只处理指定 ID（可重复） |

#### 处理流程

1. 加载所有诗歌（id, title, author, lines, aiExplanation）
2. 过滤掉两种 audience 都已有缓存的诗歌
3. 对每首诗：先 child_v1 后 general_v1
   - 跳过已有 cache key（断点续传）
   - 调用 `explainPoetry()` + retry(3次, 指数退避)
   - 合并写入 `aiExplanation` JSONB 字段
4. 每首诗之间 sleep `rateLimitMs`
5. 汇总报告

#### 重试策略

- 最多 3 次重试
- 指数退避：`min(2000 × 2^attempt, 30000)` — 2s, 4s, 8s
- 429：从 Retry-After header 读取，否则等 10s
- 3 次都失败：记录失败，继续下一首

#### 日志格式

```
[1/293] 杜甫《春望》 — generating child_v1...
  OK — cached (summary: 52字, imagery: 48字, emotion: 41字)
  generating general_v1...
  OK — cached (summary: 63字, imagery: 55字, emotion: 47字)
```

## Phase 2：批量生成讲解音频

### 脚本：`scripts/generate-explain-audio.py`

#### 音色方案

| audience | 音色 ID | 说明 |
|---|---|---|
| child_v1 | `yuanqishaonv` | 元气少女 |
| general_v1 | `linjiajiejie` | 邻家姐姐 |

#### 存储路径

`public/audio/explain/{poetryId}_{audience}.mp3`

#### 处理流程

1. 从 DB 读取已有 AI 讲解的诗歌
2. 拼接讲解文本：`{summary}\n{imagery}\n{emotion}`
3. 调用 StepFun TTS，按 audience 选择音色
4. 跳过已存在的 MP3（断点续传）
5. 支持 950 字符截断

## Phase 3-4：前端改造

（详见 `docs/task-batch-ai-explain-tts.md`）
