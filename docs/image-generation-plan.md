# 366 首唐诗配图执行方案

## 目标

为全部 `366` 首诗生成 `2:3` 竖版儿童绘本水彩插图，并让运行时页面通过 `ImageAsset` 读取到 `ready` 资产。

## 设计原则

- 重点不是统一套模板，而是先分析每首诗的意境
- 每张图都要包含：
  - 诗意场景
  - 情绪氛围
  - 画面主体
- 统一视觉语言参考 `AIimage/` 下 3 张样图：
  - 奶油色中心留白
  - 四周轻柔框景
  - 水彩纸纹理
  - 儿童陪伴式角色
  - 柔和低饱和配色

## 已补好的脚本

### 1. 生成批量任务与导入草稿

```bash
npx tsx scripts/prepare-image-generation.ts
```

产物：

- `AIimage/poetry-image-batch.json`
- `data/image-assets.json`
- `docs/image-generation-manifest.md`
- `docs/poetry-image-prompt-guide.md`

### 2. 扫描已生成图片并把导入草稿切成 ready

要求本地成品图放在：

```text
public/images/generated/
  ts300-0001.png
  ts300-0001-thumb.png
```

执行：

```bash
npx tsx scripts/finalize-image-assets.ts
```

### 3. 导入数据库

```bash
npm run import:image-assets
```

## 推荐执行顺序

1. 先运行 `prepare-image-generation.ts`
2. 检查 `AIimage/poetry-image-batch.json`
3. 用批量图像工具生成 366 张图
4. 把成品图整理到 `public/images/generated/`
5. 运行 `finalize-image-assets.ts`
6. 运行 `npm run import:image-assets`
7. 抽查首页、详情页、复习页是否不再回退占位图

## 批次建议

不要一次性人工验收 366 张。

建议按 `40` 首一批：

- 第 1 批：高频诗 / 首页候选
- 第 2 批：启蒙短诗与低年级常见诗
- 第 3-9 批：其余诗作

每批流程：

1. 提交批量生成
2. 人工抽查 5-10 张
3. 不合格 prompt 微调后重跑该批
4. 通过后再进入下一批
