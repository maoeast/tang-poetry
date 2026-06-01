# 366 首唐诗配图执行方案

> **状态：已完成。** 2026-05-31 全部 366 首通过 apimart gpt-image-2 生成并导入数据库。

## 目标

为全部 `366` 首诗生成 `2:3` 竖版儿童绘本水彩插图，并让运行时页面通过 `ImageAsset` 读取到 `ready` 资产。

## 已执行步骤

1. ✅ Preview 审核：`ts300-0001`、`ts300-0002`、`ts300-0004` 三张通过人工审核
2. ✅ 批量提交：全部剩余任务 fire-and-forget 提交到 apimart，task manifest 保存为 `AIimages/task-manifest.json`
3. ✅ 批量下载：apimart 后台生成完成后，逐批下载到 `AIimages/`，TLS 抖动时逐首重试
4. ✅ 整理入库：拷贝到 `public/images/generated/` → `finalize-image-assets.ts` → `npm run import:image-assets`
5. ✅ 结果：`ImageAsset` 表 366 条 ready 记录（style=`storybook-watercolor`，promptVersion=`v1`）

## 设计原则

- 重点不是统一套模板，而是先分析每首诗的意境
- 先跑 preview 审核批次，再放大到正式 40 首分批
- 每张图都要包含：
  - 诗意场景
  - 情绪氛围
  - 画面主体
- Prompt 必须保留：
  - 诗名
  - 作者
  - 朝代
  - 精简诗句摘录
- 不允许使用固定花月窗景或强制中心留白模板覆盖所有诗作

## 已补好的脚本

### 1. 生成批量任务与导入草稿

```bash
npx tsx scripts/prepare-image-generation.ts
```

产物：

- `AIimages/batches/poetry-image-batch-01-preview.json`
- `AIimages/batches/poetry-image-batch-01.json` 至 `poetry-image-batch-10.json`
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
2. 先只检查并提交 `AIimages/batches/poetry-image-batch-01-preview.json`
3. 人工审核 `ts300-0001`、`ts300-0002`、`ts300-0004` 三张 preview 图
4. 审核通过后，再按 `AIimages/batches/poetry-image-batch-01.json` 起正式 40 首批次
5. 把通过审核的成品图整理到 `public/images/generated/`
6. 运行 `finalize-image-assets.ts`
7. 运行 `npm run import:image-assets`
8. 抽查首页、详情页、复习页是否不再回退占位图

## 批次建议

不要一次性人工验收 366 张。

建议固定分两层：

- Preview 批：`ts300-0001`、`ts300-0002`、`ts300-0004`
- 正式批：按 `40` 首一批，共 `10` 批

每批流程：

1. 提交批量生成
2. 人工抽查 5-10 张
3. 不合格 prompt 微调后重跑该批
4. 通过后再进入下一批
