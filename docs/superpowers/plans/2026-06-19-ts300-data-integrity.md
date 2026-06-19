# ts300 Data Integrity Implementation Plan

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 审计并修复 `ts300` 诗歌、图片清单、音频文件和 AI 解说音频之间的编号错配与陈旧索引问题。

**架构：** 将完整性规则抽到独立的 `lib` 模块，以便先用单元测试固定行为，再由审计脚本读取数据库和本地文件系统输出报告，最后由修复脚本安全地回写派生 JSON 并清理明确失效的旧资源。

**技术栈：** TypeScript、Node.js、Prisma、node:test

---

### 任务 1：实现完整性规则并补测试

**文件：**
- 创建：`lib/data/ts300-integrity.ts`
- 创建：`tests/data/ts300-integrity.test.ts`

- [ ] 定义 ts300 导出与错配检测所需类型和纯函数
- [ ] 为文件名审计、清单差异、导出格式编写单元测试
- [ ] 运行对应测试确认红绿

### 任务 2：实现审计脚本

**文件：**
- 创建：`scripts/audit-ts300-integrity.ts`
- 修改：`package.json`

- [ ] 读取数据库、`data/` JSON 和 `public/audio` 目录
- [ ] 输出 `ts300` 诗歌、图片清单、诗歌音频、AI 解说音频的差异报告
- [ ] 增加 npm script 便于重复执行

### 任务 3：实现修复脚本

**文件：**
- 创建：`scripts/repair-ts300-integrity.ts`
- 修改：`package.json`

- [ ] 以数据库为当前真源导出 `data/ts300.simple.json`
- [ ] 以数据库为当前真源导出 `data/ts300.raw.json`
- [ ] 以数据库为当前真源导出 `data/poetries.normalized.json`
- [ ] 以数据库为当前真源导出 `data/image-assets.json`
- [ ] 清理不存在于数据库中的陈旧 `ts300` AI 解说音频文件
- [ ] 清理不存在于数据库 `sourceUid` 集合中的孤儿诗歌音频文件

### 任务 4：运行修复并验证

**文件：**
- 修改：`data/ts300.simple.json`
- 修改：`data/ts300.raw.json`
- 修改：`data/poetries.normalized.json`
- 修改：`data/image-assets.json`

- [ ] 运行审计脚本记录修复前状态
- [ ] 运行修复脚本执行同步
- [ ] 再次运行审计脚本确认问题收敛
- [ ] 运行新增测试与关键现有测试确认未破坏行为
