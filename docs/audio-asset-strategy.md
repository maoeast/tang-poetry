# 音频资产管理策略

## 当前结论

项目运行时只认一套成品目录：

```text
public/audio/poetry/<sourceUid|poetryId>.mp3
```

`lib/audio.ts` 会优先按 `Poetry.sourceUid` 取文件名，缺失时才回退到 `poetryId`。

当前本地成品目录规模：

- 文件数：366
- 体积：约 427 MB

这类二进制资产不适合直接进入普通 Git 历史，所以仓库默认忽略 `public/audio/`。

## 推荐方案

### 开发环境

- 本地直接保留 `public/audio/poetry/`
- 启动应用时不设置 `AUDIO_BASE_URL`
- Next.js 直接通过 `/audio/poetry/*.mp3` 提供静态访问

### 生产环境

- 将 `public/audio/poetry/` 同步到对象存储或 CDN
- 设置：

```env
AUDIO_BASE_URL="https://your-cdn.example.com/audio/poetry"
```

- 运行时代码无需改动

## 为什么不建议把音频直接提交到 Git

- 427 MB 的成品目录会快速膨胀仓库体积
- 音频是覆盖式资产，版本 diff 价值很低
- 普通 Git 对大二进制文件不友好，拉取、克隆、CI 都会变慢

## 什么时候考虑 Git LFS

只有在下面条件同时成立时才建议启用 Git LFS：

- 你明确想把成品音频随仓库版本一起发版
- 团队成员和 CI 都能稳定使用 Git LFS
- 部署链路也接受从 Git/LFS 拉音频

否则，优先使用“本地目录 + 对象存储同步”的模式。

## TTS 生成脚本

仓库提供离线脚本：

```bash
python scripts/generate-tts-audio.py
```

要求：

- 必须先设置 `STEPFUN_API_KEY`
- 默认输出到 `public/audio/poetry/`
- 可用 `--output-dir` 改到其他目录

示例：

```bash
export STEPFUN_API_KEY="your-key"
python scripts/generate-tts-audio.py
python scripts/generate-tts-audio.py --output-dir /tmp/poetry-audio
```

## 建议的部署流

1. 在本地或专门的内容机生成 / 校验音频
2. 将成品目录同步到对象存储
3. 在部署环境设置 `AUDIO_BASE_URL`
4. 应用运行时只消费 URL，不承担音频生成职责
