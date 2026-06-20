# 诗图 Prompt 归纳

## 当前视觉方向

当前批量出图遵循的稳定视觉语言：

- 统一为 `2:3` 竖版儿童诗画海报
- 使用温柔的中国绘本水彩与低饱和发光感
- 每首诗的画面由 DeepSeek 根据诗句意象单独生成，不使用固定模板
- 保留适量留白但不强制中心留白区
- 人物以儿童化、安静陪伴式角色为主

## Prompt 方案

主路径：DeepSeek 根据每首诗的具体意象（物、人、自然现象、场景）生成个性化画面描述，
套入统一的风格框架（水彩、低饱和、儿童化）。

个性化进度缓存在 `AIimages/batches/.personalized-progress.json`，
重新生成批次时自动读取，已完成的诗不会重复调用 API。

如果进度缓存不存在，使用简化的情绪基调方案作为兜底。

## 默认参数

- style: `storybook-watercolor`
- promptVersion: `v1`
- size: `2:3`
- resolution: `2k`
