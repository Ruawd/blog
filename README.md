# Ruawd Blog

一个可部署到普通 VPS/服务器的 Next.js 个人博客。前台、文章接口和管理后台位于同一个项目中，数据保存在服务器 SQLite 文件里。

## 功能

- `/blog`：公开文章列表与文章详情
- `/message`：公开留言簿
- `/mine/bangumi`：从 Bangumi API 同步动画、书籍、音乐和游戏收藏
- `/admin/login`：管理员登录
- `/admin`：文章编辑、各页面内容编辑、Bangumi API 配置，以及留言/评论审核
- 每篇文章拥有独立评论区，昵称、网站和正文公开，邮箱仅后台可见
- 页面与文章编辑器均支持 Markdown 实时预览
- `/api/admin/*`：受服务端会话保护的内容管理接口
- 原有静态文章继续保留；在后台编辑后由数据库版本覆盖

## Bangumi 同步

番组计划默认读取用户 `ruawd` 在 `https://api.bgm.tv` 的公开收藏。登录后台后进入“番组 API”，可以修改：

- Bangumi 用户 ID
- API 根地址和条目跳转地址
- User-Agent、缓存时间和展示分类
- 可选 Access Token，以及是否公开展示私有收藏

访问令牌只用于服务器端请求，写入 SQLite 前会使用 `SESSION_SECRET` 派生的密钥进行 AES-256-GCM 加密，管理接口不会返回令牌明文。更换 `SESSION_SECRET` 后需要重新填写访问令牌。

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
