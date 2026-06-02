# 唐诗画境一期——给 Codex 的修改建议（最终版）

请根据以下审查意见，对现有的设计规格文档和实现计划文档进行修订，输出两份更新后的完整文档。

---

## 一、项目基本信息

- 本地开发环境：Windows 10 和 Deepin 25 双系统
- 生产环境：腾讯云轻量服务器（2核4G，SSD 70GB，Ubuntu）
- 代码托管：GitHub
- 访问方式：HTTP + 公网 IP（无域名，暂不配置 HTTPS）

---

## 二、技术栈修订

**修订点 1：数据库统一改为 PostgreSQL 16**

不再区分 SQLite（本地）和 PostgreSQL（上线）。本地开发和生产环境统一使用 PostgreSQL 16。本地开发通过项目根目录的 `docker-compose.yml` 启动 PostgreSQL，Windows 用 Docker Desktop，Deepin 用 Docker + Docker Compose，启动命令统一为：

```bash
docker-compose up -d
```

**修订点 2：删除 User 模型和所有注册登录逻辑**

用一个固定的 `SYSTEM_USER_ID`（写在环境变量里）替代用户系统。`LearningRecord`、`ChallengeAttempt`、`ReviewState`、`Favorite` 里的 `userId` 字段保留，但固定引用此值，不做多用户区分。

访问保护通过 Next.js middleware 实现简单密码验证：读取环境变量 `APP_PASSWORD`，用 cookie 记录已验证状态。

文档中必须明确标注：**这是"一期单用户实现"，不是"系统天然不支持多用户"**。数据模型保留 `userId` 维度，为后续多用户扩展预留接口，但一期不实现。

**修订点 3：繁简转换库确认使用 `opencc-js`**

---

## 三、数据与业务逻辑修订

**修订点 4：删除今日一诗的日期哈希算法**

改用 `DailyPoetry` 数据表，结构为：

- `date`（字符串，格式 `YYYY-MM-DD`）
- `poetryId`

导入脚本需包含生成未来一年每日诗歌映射的逻辑，提前批量写入。节气、节日等特殊日期可后续手工调整对应诗歌。

**修订点 5：`aiExplanation` 字段改为带版本区分的结构化缓存**

在 `Poetry` 表新增 `aiExplanation Json?` 字段，存储结构必须支持多受众和多 prompt 版本区分，格式如下：

```json
{
  "child_v1": {
    "summary": "这首诗写的是……",
    "imagery": "你可以把它想成……",
    "emotion": "诗人当时……",
    "cachedAt": "2026-05-29T10:00:00Z"
  },
  "general_v1": {
    "summary": "……",
    "imagery": "……",
    "emotion": "……",
    "cachedAt": "2026-05-29T10:00:00Z"
  }
}
```

key 格式为 `{audience}_{promptVersion}`，一期 audience 取值为 `child` 或 `general`，promptVersion 从 `v1` 开始。

AI 讲解 API 路由逻辑：

1. 按 `poetryId + audience + promptVersion` 查对应 key 是否存在
2. 存在则直接返回缓存，不调用 DeepSeek
3. 不存在则调用 DeepSeek，将结果写入对应 key 后返回

prompt 升级时只需递增 `promptVersion`，旧版本缓存保留不影响。

**修订点 6：复习调度规则写死具体参数**

不留模糊描述，使用以下确定规则：

| 事件 | 规则 |
|------|------|
| 首次学习后 | 加入复习池，`nextReviewAt` = 当天 + 1 天 |
| 答对一次 | 间隔 × 2（序列：1→2→4→7→15→30 天，30 天封顶） |
| 答错一次 | `wrongCount` +1，`nextReviewAt` 重置为次日，`mastery` -1（最低为 0） |
| 连续答错 3 次 | `nextReviewAt` 设为当天，今日强制复习 |

**修订点 7：`ordering` 题型加防重复检测**

乱序排句出题时，需检测随机排列结果是否与原文顺序相同，若相同则重新随机，确保用户必须思考。

---

## 四、图片资产修订

**修订点 8：明确图片资产的数据源层级**

图片资产以数据库 `ImageAsset` 表为唯一运行时数据源。`image-assets.json` 保留，但角色仅限于"批量生成后导入数据库的中间产物"，不在运行时读取。

导入链路必须保留：

- 支持从 `image-assets.json` 批量写入 `ImageAsset` 表的导入脚本
- `getPoetryImage()` 工具函数优先返回数据库中 `status = "ready"` 的资产，缺失时回退到占位图，回退逻辑不依赖 JSON 文件

---

## 五、部署方案新增

**修订点 9：在实现计划末尾新增"任务 14：生产部署配置"**

包含以下步骤：

- [ ] 服务器安装 Node.js 22、PostgreSQL 16、Nginx、PM2
- [ ] 从 GitHub 克隆仓库，安装依赖，运行 `prisma migrate deploy`
- [ ] PM2 启动 Next.js，配置开机自启
- [ ] Nginx 配置反向代理，将 80 端口转发到 3000 端口
- [ ] 记录后续更新流程：`git pull` → `npm ci` → `prisma migrate deploy` → `pm2 restart`

**关于访问保护的安全说明（必须写入任务 14 文档）**

一期访问保护方案（`APP_PASSWORD` + cookie + HTTP）是在以下条件下有意识做出的权衡：

- 应用为家庭私有部署，无支付、无敏感个人数据
- 无域名阶段无法配置 HTTPS 证书
- 实际威胁模型风险极低

文档必须同时记录以下升级路径作为明确的后续任务（不是模糊建议）：

- 购买域名并完成备案后，使用 Certbot 为 Nginx 配置 Let's Encrypt 免费证书
- 启用 HTTPS 后，将 cookie 标记为 `Secure` + `HttpOnly` + `SameSite=Strict`
- 届时 `APP_PASSWORD` 方案才具备真正的传输安全性

---

## 六、工程规范新增

**修订点 10：项目根目录必须包含以下文件**

| 文件 | 内容 |
|------|------|
| `.gitattributes` | `* text=auto eol=lf`，统一换行符为 LF |
| `.nvmrc` | `22`，锁定 Node 版本 |
| `docker-compose.yml` | 启动本地 PostgreSQL 16 |
| `.env.example` | 包含所有必需环境变量，每条附注释 |

**修订点 11：所有文件路径使用相对路径**

不出现任何盘符或绝对路径（删除原文档中所有 `G:\tang poetry\` 前缀，改为相对于项目根目录的路径）。

**修订点 12：完整环境变量清单**

`.env.example` 须包含以下全部条目：

```env
# 数据库连接
DATABASE_URL="postgresql://dev:devpassword@localhost:5432/tang_poetry"

# DeepSeek AI 接口
DEEPSEEK_API_KEY=""
DEEPSEEK_BASE_URL="https://api.deepseek.com"

# 应用访问
APP_URL="http://你的公网IP"
APP_PASSWORD="设置一个访问密码"

# 固定用户 ID（一期单用户实现，替代用户系统）
SYSTEM_USER_ID="family-001"
```

---

## 七、不需要改动的部分

以下内容保持原样，不做修改：

- Next.js App Router 整体架构
- Prisma schema 结构（仅在受上述修订影响处做对应调整）
- 信息架构（今日、挑战、复习、我的四个核心页面）
- AI 讲解按需加载与降级逻辑
- 任务 1 到 13 的拆分顺序和粒度（仅在受修订影响的步骤处做对应调整）
- 视觉方向、配色原则与构图原则
- 图片策略的核心预生成 + 长尾后补思路
- DeepSeek 的职责边界（讲解、白话转换、延展提问；不参与判题和进度规则）
