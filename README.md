# Ruawd 个人主页

一个可部署到普通 VPS/服务器的 Next.js 个人主页，集中展示文章、项目、相册、番组与数字生活。前台、内容接口和管理后台位于同一个项目中，数据保存在服务器 SQLite 文件里。

## 功能

- `/blog`：公开文章列表与文章详情
- `/now`：自动汇总近期文章与相册更新的“此刻”页面
- `/projects`：可由后台编辑、排序、精选和发布的项目展示
- `/uses`：当前使用的技术、服务与工作方式
- `/mine/album`：多子相册目录，每个子相册拥有独立详情页和原比例瀑布流
- 全站搜索：点击导航栏搜索按钮或使用 `Ctrl/Cmd + K`，支持中文、拼音、分类与标签
- `/message`：公开留言簿
- `/mine/bangumi`：从 Bangumi API 同步动画、书籍、音乐和游戏收藏
- `/admin/login`：通过 Casdoor 登录管理后台
- `/admin`：文章、项目、各页面内容、相册、友链、Bangumi API 与留言评论管理
- 每篇文章拥有独立评论区，昵称、网站和正文公开，邮箱仅后台可见
- 留言与评论支持 HTTPS 头像链接；未填写时由本站代理尝试 Gravatar，失败则显示昵称首字
- 留言与评论支持楼中楼、点赞、Emoji 回应、分页、评论锚点与持久化限流
- 文章支持服务器自动保存、历史版本、定时发布、上一篇/下一篇和相关推荐
- 相册支持本地上传、EXIF 拍摄时间、拖拽排序、原比例瀑布流与全屏灯箱
- 友链支持单条或批量自动复查，并提供受密钥保护的定时任务接口
- 后台支持 SQLite 在线备份、下载、删除和完整性校验后恢复
- 提供暗色模式、RSS、站点地图、robots.txt、Web App Manifest 和文章结构化数据
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

- `CASDOOR_ISSUER`、`CASDOOR_CLIENT_ID`、`CASDOOR_CLIENT_SECRET`
- `CASDOOR_REDIRECT_URI`（固定为站点的 `/api/auth/casdoor/callback`）
- `CASDOOR_ALLOWED_USER`（仅该 Casdoor `preferred_username` 可进入后台）
- 至少 32 个字符的 `SESSION_SECRET`
- 本地 HTTP 调试时设置 `COOKIE_SECURE=false`
- `BACKUP_PATH`：SQLite 备份目录，Docker 默认建议 `/app/data/backups`
- `CRON_SECRET`：调用定时备份和友链复查接口时使用的 Bearer Token

评论通知为可选配置，可以按需设置：

- `COMMENT_NOTIFICATION_WEBHOOK_URL`：新评论 Webhook
- `TELEGRAM_BOT_TOKEN` 与 `TELEGRAM_CHAT_ID`：Telegram 管理员提醒
- `RESEND_API_KEY` 与 `COMMENT_FROM_EMAIL`：楼中楼回复邮件提醒

## Docker 部署

```bash
cp .env.example .env
# 编辑 .env，填入 Casdoor OIDC 信息和 SESSION_SECRET
docker compose up -d --build
```

默认映射到服务器的 `3000` 端口，可通过 `.env` 中的 `APP_PORT` 修改。文章数据库保存在 Docker 卷 `blog_data` 中，更新容器不会丢失。

相册上传文件、数据库备份与待恢复文件也保存在同一个数据卷中。后台上传恢复文件后，需要重启容器：

```bash
docker compose restart blog
```

## 定时任务

创建数据库备份：

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://你的域名/api/cron/backup
```

批量复查公开与待审核友链：

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://你的域名/api/cron/friends
```

可以通过系统 Cron 每天调用备份接口、每周调用友链复查接口。数据库备份默认最多保留 20 份。

生产环境请在容器前使用 Nginx、Caddy 等反向代理并启用 HTTPS；`COOKIE_SECURE` 保持为 `true`。

## 直接使用 Node.js 部署

```bash
npm ci
npm run build
npm run db:migrate
npm start
```

Node.js 版本要求 `>=22.13.0`。直接部署时请为 `data/` 目录配置持久化备份。
