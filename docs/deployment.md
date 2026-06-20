# 生产部署文档

> 目标环境：家庭内网 Linux（Debian / Ubuntu），单用户部署，使用 `SYSTEM_USER_ID`。

---

## 1. 服务器基础安装

以下组件需要在生产服务器上安装：

### 1.1 Node.js 22

```bash
# 使用 NodeSource 官方源安装 Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node -v   # v22.x.x
npm -v    # 10.x.x
```

### 1.2 PostgreSQL 16

```bash
# 添加 PostgreSQL 官方 APT 源
sudo apt-get install -y curl ca-certificates
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
  --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc

sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
  https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list'

sudo apt-get update
sudo apt-get install -y postgresql-16

# 创建数据库和用户（与 .env 中的连接串一致）
sudo -u postgres psql -c "CREATE USER dev WITH PASSWORD 'devpassword';"
sudo -u postgres psql -c "CREATE DATABASE tang_poetry OWNER dev;"

# 验证连接
psql -h localhost -U dev -d tang_poetry -c "SELECT 1;"
```

> **安全建议**：生产环境应使用强密码替换 `devpassword`，并在 `.env.local` 中同步更新 `DATABASE_URL`。

### 1.3 Nginx

```bash
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 1.4 PM2

```bash
sudo npm install -g pm2

# 设置开机自启（PM2 会生成一条 sudo 命令，按提示执行）
pm2 startup
```

---

## 2. 初始部署流程

### 2.1 克隆仓库

```bash
cd /opt   # 或任意部署目录
git clone <repo-url> tang-poetry
cd tang-poetry
```

### 2.2 安装依赖

```bash
npm ci
```

### 2.3 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填写以下变量：

```bash
# 数据库连接（使用生产密码）
DATABASE_URL="postgresql://dev:<strong-password>@localhost:5432/tang_poetry"

# DeepSeek AI 讲解功能
DEEPSEEK_API_KEY="<your-key>"
DEEPSEEK_BASE_URL="https://api.deepseek.com"

# 应用访问地址（部署后改为实际 IP 或域名）
APP_URL="http://<server-ip>:3000"

# 访问密码（留空则不启用密码保护）
APP_PASSWORD="set-a-family-password"

# 单用户 ID（一期固定值，无需修改）
SYSTEM_USER_ID="family-001"

# 音频 CDN（可选，留空使用本地文件）
# AUDIO_BASE_URL="https://cdn.example.com/audio/poetry"

# TTS 生成脚本专用（部署时可留空）
STEPFUN_API_KEY=""
```

### 2.4 数据库迁移

```bash
npx prisma migrate deploy
```

> `migrate deploy` 只执行未应用的迁移，不会提示确认，适合生产环境。

### 2.5 构建应用

```bash
npm run build
```

### 2.6 导入数据

```bash
# 导入三个数据集（唐诗三百首 + 古诗三百 + 宋词精选）
npm run import:all

# 导入图片资源
npm run import:image-assets
```

### 2.7 迁移本地资产（从开发机拷贝）

以下目录在 git 中被忽略，需从开发机手动复制：

```bash
# 在开发机上打包
tar czf assets-backup.tar.gz \
  public/audio/ \
  public/images/generated/

# 传输到服务器
scp assets-backup.tar.gz user@<server-ip>:/opt/tang-poetry/

# 在服务器上解压
cd /opt/tang-poetry
tar xzf assets-backup.tar.gz
```

如需迁移已有用户数据（学习记录、复习状态等），使用 `pg_dump` / `pg_restore`：

```bash
# 在旧服务器上导出
pg_dump -h localhost -U dev tang_poetry > tang_poetry_backup.sql

# 在新服务器上导入
psql -h localhost -U dev tang_poetry < tang_poetry_backup.sql
```

### 2.8 启动应用

```bash
# 使用 PM2 启动 Next.js 生产服务器
pm2 start npm --name "tang-poetry" -- start

# 保存进程列表（配合开机自启）
pm2 save

# 查看状态
pm2 status
pm2 logs tang-poetry
```

---

## 3. Nginx 反向代理配置

### 3.1 创建配置文件

```bash
sudo nano /etc/nginx/sites-available/tang-poetry
```

写入以下内容：

```nginx
server {
    listen 80;
    server_name _;   # 家庭内网无需域名，匹配所有请求

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 3.2 启用站点

```bash
# 创建符号链接
sudo ln -sf /etc/nginx/sites-available/tang-poetry /etc/nginx/sites-enabled/

# 移除默认站点（可选）
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

部署完成后，内网设备可通过 `http://<server-ip>` 访问应用。

---

## 4. 更新流程

后续代码更新时，执行以下步骤：

```bash
cd /opt/tang-poetry

# 1. 拉取最新代码
git pull

# 2. 更新依赖（依赖变更时）
npm ci

# 3. 应用数据库迁移（如有新迁移文件）
npx prisma migrate deploy

# 4. 重新构建
npm run build

# 5. 重启应用
pm2 restart tang-poetry
```

如果只是前端改动（无依赖变更、无数据库迁移），可以简化为：

```bash
git pull && npm run build && pm2 restart tang-poetry
```

---

## 5. 访问保护安全说明

### 5.1 当前方案

一期访问保护基于以下机制：

- **密码保护**：`APP_PASSWORD` 环境变量控制是否启用密码门
- **Cookie 验证**：验证通过后设置 `tang-poetry-session=verified` cookie
- **中间件拦截**：`middleware.ts` 对所有非公开路径检查 cookie，未验证则重定向到 `/unlock`
- **无密码模式**：`APP_PASSWORD` 为空时跳过所有验证，适合完全信任的内网环境

### 5.2 安全边界

> ⚠️ **重要说明**

当前方案是**家庭私有部署**场景下的权衡选择，存在以下已知限制：

| 项目 | 现状 | 风险 |
|------|------|------|
| 传输加密 | HTTP 明文 | 密码和 cookie 可被同一网络的中间人截获 |
| Cookie 安全 | 无 `Secure` / `HttpOnly` 标记 | 浏览器不会对 cookie 做传输加密保护 |
| 用户模型 | 单用户 `SYSTEM_USER_ID` | 无多用户隔离 |
| 数据敏感度 | 无支付、无敏感个人信息 | 低风险 |

### 5.3 适用场景

当前方案**仅适用于**以下条件同时满足的场景：

- ✅ 家庭内网部署，不暴露到公网
- ✅ 无支付功能，无敏感个人数据
- ✅ 使用者为信任的家庭成员
- ✅ 无公网域名

如果服务器需要暴露到公网，**必须先完成 HTTPS 升级**（见下一节）。

---

## 6. HTTPS 升级路径

当需要将应用暴露到公网时，按以下步骤升级安全性：

### 6.1 前置条件

- 拥有已备案的域名（国内服务器必须完成 ICP 备案）
- 域名 DNS 解析已指向服务器公网 IP
- 服务器 80/443 端口已在防火墙中开放

### 6.2 安装 Certbot 并申请证书

```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 申请 Let's Encrypt 免费证书（自动修改 Nginx 配置）
sudo certbot --nginx -d your-domain.com

# 证书自动续期（Certbot 已内置 systemd timer）
sudo certbot renew --dry-run   # 验证续期流程
```

### 6.3 更新 Nginx 配置

Certbot 会自动将 HTTP 重定向到 HTTPS 并配置证书路径。更新后的配置大致为：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 6.4 启用安全 Cookie

HTTPS 启用后，更新 `lib/auth/session.ts` 中的 cookie 设置，添加安全标记：

```
Secure       — 仅通过 HTTPS 传输
HttpOnly     — 禁止 JavaScript 访问，防 XSS
SameSite=Strict — 仅发送给同站请求，防 CSRF
```

同时更新 `.env.local`：

```bash
APP_URL="https://your-domain.com"
```

> 完成 HTTPS 升级后，`APP_PASSWORD` 方案才具备真正的传输安全性。
