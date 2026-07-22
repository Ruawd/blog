# Ruawd Blog

一个可部署到普通 VPS/服务器的 Next.js 个人博客。前台、文章接口和管理后台位于同一个项目中，数据保存在服务器 SQLite 文件里。

## 功能

- `/blog`：公开文章列表与文章详情
- `/admin/login`：管理员登录
- `/admin`：新建、编辑、实时 Markdown 预览、保存草稿和发布文章
- `/api/admin/*`：受服务端会话保护的文章管理接口
- 原有静态文章继续保留；在后台编辑后由数据库版本覆盖

## 本地运行

```bash
cp .env.example .env.local
npm install
npm run dev
```

本地环境建议将 `DATABASE_PATH` 改为 `./data/blog.sqlite`，并设置：

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`（推荐）或 `ADMIN_PASSWORD`
- 至少 32 个字符的 `SESSION_SECRET`
- 本地 HTTP 调试时设置 `COOKIE_SECURE=false`

生成密码哈希：

```bash
npm run admin:hash -- "你的强密码"
```

## Docker 部署

```bash
cp .env.example .env
# 编辑 .env，填入管理员密码哈希和 SESSION_SECRET
docker compose up -d --build
```

默认映射到服务器的 `3000` 端口，可通过 `.env` 中的 `APP_PORT` 修改。文章数据库保存在 Docker 卷 `blog_data` 中，更新容器不会丢失。

生产环境请在容器前使用 Nginx、Caddy 等反向代理并启用 HTTPS；`COOKIE_SECURE` 保持为 `true`。

## 直接使用 Node.js 部署

```bash
npm ci
npm run build
npm run db:migrate
npm start
```

Node.js 版本要求 `>=22.13.0`。直接部署时请为 `data/` 目录配置持久化备份。
