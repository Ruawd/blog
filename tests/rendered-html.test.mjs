import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { createHmac } from "node:crypto"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { after, before, test } from "node:test"

const projectRoot = resolve(import.meta.dirname, "..")
const adminUsername = "Ruawd"
const sessionSecret = "test-session-secret-that-is-longer-than-thirty-two-characters"

let server
let temporaryDirectory
let baseUrl

async function reservePort() {
  return new Promise((resolvePort, reject) => {
    const socket = createServer()
    socket.once("error", reject)
    socket.listen(0, "127.0.0.1", () => {
      const address = socket.address()
      const port = typeof address === "object" && address ? address.port : 0
      socket.close((error) => error ? reject(error) : resolvePort(port))
    })
  })
}

async function waitUntilReady(url) {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 200))
  }
  throw new Error("The production server did not become ready in time")
}

before(async () => {
  const port = await reservePort()
  temporaryDirectory = await mkdtemp(join(tmpdir(), "ruawd-blog-test-"))
  baseUrl = `http://127.0.0.1:${port}`
  server = spawn(process.execPath, [join(projectRoot, ".next", "standalone", "server.js")], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      DATABASE_PATH: join(temporaryDirectory, "blog.sqlite"),
      SESSION_SECRET: sessionSecret,
      CASDOOR_ISSUER: "https://casdoor.example.com",
      CASDOOR_CLIENT_ID: "test-casdoor-client",
      CASDOOR_CLIENT_SECRET: "test-casdoor-secret",
      CASDOOR_REDIRECT_URI: `${baseUrl}/api/auth/casdoor/callback`,
      CASDOOR_ALLOWED_USER: adminUsername,
      COOKIE_SECURE: "false",
    },
    stdio: "ignore",
  })
  await waitUntilReady(baseUrl)
})

after(async () => {
  server?.kill()
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true })
})

function request(pathname, options = {}) {
  return fetch(`${baseUrl}${pathname}`, { redirect: "manual", ...options })
}

function adminCookie() {
  const payload = Buffer.from(JSON.stringify({
    username: adminUsername,
    exp: Date.now() + 60 * 60 * 1000,
  })).toString("base64url")
  const signature = createHmac("sha256", sessionSecret).update(payload).digest("base64url")
  return `ruawd_admin_session=${payload}.${signature}`
}

test("renders the site identity and real blog index", async () => {
  const [homeResponse, blogResponse, categoriesResponse] = await Promise.all([
    request("/"),
    request("/blog"),
    request("/blog/categories"),
  ])
  assert.equal(homeResponse.status, 200)
  assert.equal(blogResponse.status, 200)
  assert.equal(categoriesResponse.status, 200)

  const [home, blog, categories] = await Promise.all([
    homeResponse.text(),
    blogResponse.text(),
    categoriesResponse.text(),
  ])
  assert.match(home, /Ruawd/)
  assert.match(home, /\/blog-media\/profile\/avatar\.webp/)
  assert.match(home, /rel="icon" href="\/blog-media\/profile\/avatar\.webp"/)
  assert.match(home, /data-home-layout="two-x-inspired-v5"/)
  assert.match(home, /class="[^"]*\bhome-avatar-only\b[^"]*"/)
  assert.equal(home.match(/--pixel-delay:/g)?.length, 36)
  assert.match(home, /文章、相册、番组与数字生活，慢慢整理成自己的页面。/)
  assert.match(home, /Ruawd 的个人主页，也是文章、影像与兴趣收藏的入口。/)
  assert.match(home, /认识我/)
  assert.match(home, /浏览相册/)
  assert.match(home, /"@type":"ProfilePage"/)
  assert.match(home, /"@type":"Person"/)
  assert.match(home, /class="home-background home-particle-background"/)
  assert.match(home, /主页快捷入口/)
  assert.match(home, /站内入口/)
  assert.doesNotMatch(home, /WELCOME TO MY PERSONAL SITE/)
  assert.doesNotMatch(home, /的个人站/)
  assert.match(blog, /AWS Lightsail JP \$5测试/)
  assert.match(blog, /Stalwart Mail Server 安装与初步配置教程/)
  assert.match(blog, /class="post-cover"/)
  assert.match(blog, /width="800" height="600"/)
  assert.match(blog, /技术实践、VPS 测评与数字生活记录。/)
  assert.match(blog, /class="blog-rss-link" href="\/feed.xml" type="application\/rss\+xml"/)
  assert.match(blog, /订阅文章/)
  assert.match(blog, /data-view-slug="aws-lightsail-jp-5-review" data-view-count="0"/)
  assert.match(blog, /aria-label="按分类筛选文章"/)
  assert.match(blog, /href="\/blog\/categories"/)
  assert.doesNotMatch(blog, /aria-label="按标签筛选文章"/)
  assert.doesNotMatch(blog, /迁移自原来的 Firefly 博客/)
  assert.match(categories, /文章分类/)
  assert.match(categories, /全部分类/)
  assert.match(categories, /href="\/blog\?category=VPS%E6%B5%8B%E8%AF%84#latest-posts-title"/)
})

test("serves search, feeds, manifests, and crawler metadata", async () => {
  const [robotsResponse, sitemapResponse, feedResponse, manifestResponse, ogResponse, searchResponse, pinyinSearchResponse] = await Promise.all([
    request("/robots.txt"),
    request("/sitemap.xml"),
    request("/feed.xml"),
    request("/manifest.webmanifest"),
    request("/opengraph-image"),
    request("/api/search?q=lightsail"),
    request("/api/search?q=xiangce"),
  ])
  for (const response of [robotsResponse, sitemapResponse, feedResponse, manifestResponse, ogResponse, searchResponse, pinyinSearchResponse]) {
    assert.equal(response.status, 200)
  }

  assert.match(await robotsResponse.text(), /Sitemap: https:\/\/blog\.ruawd\.de\/sitemap\.xml/)
  const sitemap = await sitemapResponse.text()
  assert.match(sitemap, /https:\/\/blog\.ruawd\.de\/blog\/memos-casdoor-oauth-login/)
  assert.match(sitemap, /https:\/\/blog\.ruawd\.de\/mine\/album\/firefly/)
  const feed = await feedResponse.text()
  assert.match(feed, /<rss version="2\.0"/)
  assert.match(feed, /xmlns:content="http:\/\/purl\.org\/rss\/1\.0\/modules\/content\/"/)
  assert.match(feed, /<content:encoded><!\[CDATA\[/)
  assert.match(feed, /<h1>💻基本信息<\/h1>/)
  assert.match(feed, /https:\/\/i\.111666\.best\/image\/zoHmfWo2WCpNVFTuZTrw5z\.webp/)
  assert.match(feed, /https:\/\/blog\.ruawd\.de\/blog-media\/image-unavailable\.svg/)
  assert.match(feed, /本文受密码保护，请前往网站解锁阅读。/)
  assert.equal((await manifestResponse.json()).short_name, "Ruawd")
  assert.match(ogResponse.headers.get("content-type") ?? "", /^image\//)

  const search = await searchResponse.json()
  assert.equal(search.query, "lightsail")
  assert.ok(search.results.some((result) => result.href === "/blog/aws-lightsail-jp-5-review"))
  const pinyinSearch = await pinyinSearchResponse.json()
  assert.ok(pinyinSearch.results.some((result) => result.href === "/mine/album/firefly"))
})

test("renders an article detail route with reading tools", async () => {
  const response = await request("/blog/memos-casdoor-oauth-login")
  assert.equal(response.status, 200)
  const html = await response.text()
  assert.match(html, /在 Memos 中接入 Casdoor 登录并获取用户信息/)
  assert.match(html, /Casdoor Application 配置/)
  assert.match(html, /class="article-toc" aria-label="文章目录"/)
  assert.match(html, /class="article-progress"/)
  assert.match(html, /aria-label="返回顶部"/)
  assert.match(html, /复制文章链接/)
  assert.match(html, /class="article-code-scroll"/)
  assert.match(html, /代码内容，可横向滚动/)
  assert.match(html, /data-expanded="false"/)
  assert.match(html, /aria-label="展开文章快捷操作"/)
  assert.match(html, /id="article-action-items" aria-hidden="true"/)
  assert.match(html, /data-view-slug="memos-casdoor-oauth-login" data-view-count="0"/)
  assert.match(html, /"@type":"InteractionCounter"/)
})

test("tracks unique daily article views and exposes them on list and detail pages", async () => {
  const viewHeaders = { origin: baseUrl, "x-forwarded-for": "198.51.100.42" }
  const firstViewResponse = await request("/api/posts/memos-casdoor-oauth-login/view", {
    method: "POST",
    headers: viewHeaders,
  })
  assert.equal(firstViewResponse.status, 200)
  const actorCookie = firstViewResponse.headers.get("set-cookie")?.split(";")[0]
  assert.ok(actorCookie?.startsWith("ruawd_comment_actor="))
  assert.deepEqual(await firstViewResponse.json(), { count: 1, counted: true })

  const duplicateViewResponse = await request("/api/posts/memos-casdoor-oauth-login/view", {
    method: "POST",
    headers: { ...viewHeaders, cookie: actorCookie },
  })
  assert.equal(duplicateViewResponse.status, 200)
  assert.deepEqual(await duplicateViewResponse.json(), { count: 1, counted: false })

  const anotherPostResponse = await request("/api/posts/aws-lightsail-jp-5-review/view", {
    method: "POST",
    headers: { ...viewHeaders, cookie: actorCookie },
  })
  assert.equal(anotherPostResponse.status, 200)
  assert.deepEqual(await anotherPostResponse.json(), { count: 1, counted: true })

  const crossOriginResponse = await request("/api/posts/memos-casdoor-oauth-login/view", { method: "POST" })
  assert.equal(crossOriginResponse.status, 403)
  const missingResponse = await request("/api/posts/not-a-real-post/view", {
    method: "POST",
    headers: { ...viewHeaders, cookie: actorCookie },
  })
  assert.equal(missingResponse.status, 404)

  const [blogHtml, articleHtml] = await Promise.all([
    request("/blog").then((response) => response.text()),
    request("/blog/memos-casdoor-oauth-login").then((response) => response.text()),
  ])
  assert.match(blogHtml, /data-view-slug="aws-lightsail-jp-5-review" data-view-count="1"/)
  assert.match(articleHtml, /data-view-slug="memos-casdoor-oauth-login" data-view-count="1"/)
})

test("animates post view totals as whole numbers with the Magic UI ticker", async () => {
  const [source, ticker] = await Promise.all([
    readFile(join(projectRoot, "components", "post-view-count.tsx"), "utf8"),
    readFile(join(projectRoot, "components", "ui", "number-ticker.tsx"), "utf8"),
  ])
  assert.match(source, /NumberTicker/)
  assert.match(source, /decimals=\{0\}/)
  assert.match(source, /notation="standard"/)
  assert.doesNotMatch(source, /notation="compact"/)
  assert.match(ticker, /animate\(displayedValue\.current, value/)
  assert.match(ticker, />\{formatValue\(0\)\}<\/span>/)
})

test("keeps animated border beams from becoming mobile scroll anchors", async () => {
  const [source, styles] = await Promise.all([
    readFile(join(projectRoot, "components", "ui", "border-beam.tsx"), "utf8"),
    readFile(join(projectRoot, "app", "globals.css"), "utf8"),
  ])
  assert.match(source, /border-beam-motion/)
  assert.match(source, /border-beam-mobile-rotor/)
  assert.match(source, /--border-beam-angle/)
  assert.match(styles, /\.border-beam-motion[\s\S]*overflow-anchor: none/)
  assert.match(styles, /@media \(hover: none\) and \(pointer: coarse\), \(max-width: 767px\)/)
  assert.match(styles, /\.border-beam-path \{ display: none; \}/)
})

test("protects the management backend and supports draft-to-publish workflow", async () => {
  const [adminResponse, apiResponse, bangumiApiResponse, albumApiResponse, friendsApiResponse, backupsApiResponse] = await Promise.all([
    request("/admin"),
    request("/api/admin/posts"),
    request("/api/admin/bangumi"),
    request("/api/admin/album"),
    request("/api/admin/friends"),
    request("/api/admin/backups"),
  ])
  assert.equal(adminResponse.status, 307)
  assert.match(adminResponse.headers.get("location") ?? "", /\/admin\/login/)
  assert.equal(apiResponse.status, 401)
  assert.equal(bangumiApiResponse.status, 401)
  assert.equal(albumApiResponse.status, 401)
  assert.equal(friendsApiResponse.status, 401)
  assert.equal(backupsApiResponse.status, 401)

  const loginResponse = await request("/api/auth/casdoor/login?return_to=/admin")
  assert.equal(loginResponse.status, 307)
  const authorizationUrl = new URL(loginResponse.headers.get("location"))
  assert.equal(authorizationUrl.origin, "https://casdoor.example.com")
  assert.equal(authorizationUrl.pathname, "/login/oauth/authorize")
  assert.equal(authorizationUrl.searchParams.get("client_id"), "test-casdoor-client")
  assert.equal(authorizationUrl.searchParams.get("code_challenge_method"), "S256")
  assert.ok(loginResponse.headers.get("set-cookie")?.includes("ruawd_admin_casdoor_flow="))

  const passwordLoginResponse = await request("/api/admin/session", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ username: adminUsername, password: "disabled" }),
  })
  assert.equal(passwordLoginResponse.status, 405)
  const cookie = adminCookie()

  const authenticatedAdmin = await request("/admin", { headers: { cookie } })
  assert.equal(authenticatedAdmin.status, 200)
  const adminHtml = await authenticatedAdmin.text()
  assert.match(adminHtml, /内容管理/)
  assert.match(adminHtml, /页面内容/)
  assert.match(adminHtml, /相册/)
  assert.match(adminHtml, /友链/)
  assert.match(adminHtml, /番组 API/)
  assert.match(adminHtml, /留言与评论/)

  const bangumiToken = "integration-test-bangumi-token"
  const bangumiSaveResponse = await request("/api/admin/bangumi", {
    method: "PUT",
    headers: { cookie, origin: baseUrl, "content-type": "application/json" },
    body: JSON.stringify({
      userId: "ruawd",
      apiBaseUrl: "https://api.bgm.tv",
      subjectBaseUrl: "https://bgm.tv/subject/",
      userAgent: "RuawdBlogTest/1.0 (https://blog.ruawd.de)",
      enabledCategories: ["anime", "book", "music", "game"],
      cacheTtlSeconds: 900,
      includePrivate: false,
      accessToken: bangumiToken,
      removeAccessToken: false,
    }),
  })
  assert.equal(bangumiSaveResponse.status, 200)
  const bangumiSavedText = await bangumiSaveResponse.text()
  assert.doesNotMatch(bangumiSavedText, new RegExp(bangumiToken))
  const bangumiSaved = JSON.parse(bangumiSavedText).settings
  assert.equal(bangumiSaved.accessTokenConfigured, true)
  assert.equal(bangumiSaved.accessToken, undefined)

  const bangumiSettingsResponse = await request("/api/admin/bangumi", { headers: { cookie } })
  assert.equal(bangumiSettingsResponse.status, 200)
  const bangumiSettingsText = await bangumiSettingsResponse.text()
  assert.doesNotMatch(bangumiSettingsText, new RegExp(bangumiToken))

  const protectedEditorResponse = await request(
    "/api/admin/posts/poste-io-mail-server-guide",
    { headers: { cookie } },
  )
  assert.equal(protectedEditorResponse.status, 200)
  const protectedArticle = (await protectedEditorResponse.json()).post
  assert.equal(protectedArticle.protected, true)
  assert.equal(protectedArticle.editable, true)
  assert.equal(protectedArticle.content, "")
  assert.equal(protectedArticle.encrypted.algorithm, "AES-GCM")

  const protectedSaveResponse = await request(
    "/api/admin/posts/poste-io-mail-server-guide",
    {
      method: "PUT",
      headers: { cookie, origin: baseUrl, "content-type": "application/json" },
      body: JSON.stringify({
        slug: protectedArticle.slug,
        title: protectedArticle.title,
        description: protectedArticle.description,
        content: "PROTECTED-PLAINTEXT-SHOULD-NOT-PERSIST",
        category: protectedArticle.category,
        tags: protectedArticle.tags,
        image: protectedArticle.image,
        sourceLink: protectedArticle.sourceLink,
        status: "published",
        published: protectedArticle.published,
        protected: true,
        passwordHint: protectedArticle.passwordHint,
        readingMinutes: protectedArticle.readingMinutes,
        encrypted: protectedArticle.encrypted,
      }),
    },
  )
  assert.equal(protectedSaveResponse.status, 200)
  const protectedSaved = (await protectedSaveResponse.json()).post
  assert.equal(protectedSaved.protected, true)
  assert.equal(protectedSaved.content, "")
  assert.equal(protectedSaved.encrypted.algorithm, "AES-GCM")
  const protectedPage = await (await request("/blog/poste-io-mail-server-guide")).text()
  assert.match(protectedPage, /这篇文章受密码保护/)
  assert.doesNotMatch(protectedPage, /PROTECTED-PLAINTEXT-SHOULD-NOT-PERSIST/)

  const article = {
    slug: "integration-test-post",
    title: "后台发布流程测试",
    description: "验证草稿不会提前出现在前台，发布后可以正常阅读。",
    content: "## 第一节\n\n这是通过管理接口写入的测试正文。",
    category: "测试",
    tags: ["Next.js", "后台"],
    image: "",
    sourceLink: "",
    status: "draft",
    published: "2026-07-22",
  }
  const authHeaders = { cookie, origin: baseUrl, "content-type": "application/json" }
  const draftResponse = await request("/api/admin/posts", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(article),
  })
  assert.equal(draftResponse.status, 201)
  const createdDraft = (await draftResponse.json()).post
  assert.equal((await request("/blog/integration-test-post")).status, 404)

  const autosaveResponse = await request("/api/admin/posts/integration-test-post/autosave", {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ article: { ...createdDraft, title: "服务器自动保存标题", content: "服务器自动保存正文" } }),
  })
  assert.equal(autosaveResponse.status, 200)
  assert.equal((await autosaveResponse.json()).autosave.article.title, "服务器自动保存标题")
  const autosaveReadResponse = await request("/api/admin/posts/integration-test-post", { headers: { cookie } })
  assert.equal((await autosaveReadResponse.json()).autosave.article.content, "服务器自动保存正文")

  const publishResponse = await request("/api/admin/posts/integration-test-post", {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ ...article, status: "published" }),
  })
  assert.equal(publishResponse.status, 200)
  const afterPublishEditor = await request("/api/admin/posts/integration-test-post", { headers: { cookie } })
  assert.equal((await afterPublishEditor.json()).autosave, null)

  const publishedResponse = await request("/blog/integration-test-post")
  assert.equal(publishedResponse.status, 200)
  const publishedHtml = await publishedResponse.text()
  assert.match(publishedHtml, /后台发布流程测试/)
  assert.match(publishedHtml, /这是通过管理接口写入的测试正文/)

  const updatePublishedResponse = await request("/api/admin/posts/integration-test-post", {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ ...article, title: "临时修改后的标题", status: "published" }),
  })
  assert.equal(updatePublishedResponse.status, 200)
  const revisionsResponse = await request("/api/admin/posts/integration-test-post/revisions", { headers: { cookie } })
  assert.equal(revisionsResponse.status, 200)
  const revisions = (await revisionsResponse.json()).revisions
  const publishedRevision = revisions.find((revision) => revision.title === article.title && revision.status === "published")
  assert.ok(publishedRevision)
  const restoreRevisionResponse = await request("/api/admin/posts/integration-test-post/revisions", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ revisionId: publishedRevision.id }),
  })
  assert.equal(restoreRevisionResponse.status, 200)
  assert.equal((await restoreRevisionResponse.json()).post.title, article.title)

  const scheduledArticle = {
    ...article,
    slug: "integration-scheduled-post",
    title: "定时发布流程测试",
    status: "scheduled",
    scheduledAt: "2099-01-01T08:00",
  }
  const futureScheduledResponse = await request("/api/admin/posts", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(scheduledArticle),
  })
  assert.equal(futureScheduledResponse.status, 201)
  assert.equal((await request("/blog/integration-scheduled-post")).status, 404)
  const dueScheduledResponse = await request("/api/admin/posts/integration-scheduled-post", {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ ...scheduledArticle, scheduledAt: "2000-01-01T00:00" }),
  })
  assert.equal(dueScheduledResponse.status, 200)
  assert.equal((await request("/blog/integration-scheduled-post")).status, 200)

  const pagesResponse = await request("/api/admin/pages", { headers: { cookie } })
  assert.equal(pagesResponse.status, 200)
  const pages = (await pagesResponse.json()).pages
  const messagePage = pages.find((page) => page.key === "message")
  assert.ok(messagePage)

  const savePageResponse = await request("/api/admin/pages/message", {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      ...messagePage,
      description: "这段留言页说明来自后台页面编辑器。",
      body: "## 留言规则\n\n保持友善，认真交流。",
    }),
  })
  assert.equal(savePageResponse.status, 200)
  const editedMessagePage = await (await request("/message")).text()
  assert.match(editedMessagePage, /这段留言页说明来自后台页面编辑器。/)
  assert.match(editedMessagePage, /留言规则/)

  const albumResponse = await request("/api/admin/album", { headers: { cookie } })
  assert.equal(albumResponse.status, 200)
  const originalAlbums = (await albumResponse.json()).albums
  assert.equal(originalAlbums.length, 1)
  assert.equal(originalAlbums[0].slug, "firefly")
  assert.equal(originalAlbums[0].title, "流萤相册")
  assert.equal(originalAlbums[0].photoCount, 9)
  const originalPhotos = originalAlbums[0].photos
  assert.equal(originalPhotos.length, 9)

  const [initialAlbumDirectoryResponse, initialFireflyResponse] = await Promise.all([
    request("/mine/album"),
    request("/mine/album/firefly"),
  ])
  assert.equal(initialAlbumDirectoryResponse.status, 200)
  assert.equal(initialFireflyResponse.status, 200)
  const [initialAlbumDirectory, initialFirefly] = await Promise.all([
    initialAlbumDirectoryResponse.text(),
    initialFireflyResponse.text(),
  ])
  assert.match(initialAlbumDirectory, /流萤相册/)
  assert.match(initialAlbumDirectory, /href="\/mine\/album\/firefly"/)
  assert.match(initialAlbumDirectory, /9[\s\S]{0,30}张图片/)
  assert.equal(initialFirefly.match(/class="album-item"/g)?.length, 9)

  const invalidAlbumResponse = await request("/api/admin/album", {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      albums: [{
        slug: "unsafe-album",
        title: "不安全相册",
        description: "",
        period: "",
        coverSrc: "",
        photos: [{ src: "http://example.com/image.jpg", alt: "不安全图片", caption: "", width: 100, height: 100, takenAt: "", originalName: "" }],
      }],
    }),
  })
  assert.equal(invalidAlbumResponse.status, 400)

  const albumSaveResponse = await request("/api/admin/album", {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      albums: [
        {
          slug: "firefly",
          title: "流萤相册",
          description: "崩坏：星穹铁道中的流萤插画收藏。",
          period: "2026.01.01",
          coverSrc: originalAlbums[0].coverSrc,
          photos: [
            {
              src: originalPhotos[1].src,
              alt: originalPhotos[1].alt,
              caption: "后台前移图片",
              width: originalPhotos[1].width,
              height: originalPhotos[1].height,
              takenAt: originalPhotos[1].takenAt,
              originalName: originalPhotos[1].originalName,
            },
            {
              src: "/blog-media/profile/avatar.webp",
              alt: "后台新增相册图片",
              caption: "后台新增图片",
              width: 640,
              height: 640,
              takenAt: "2026-07-23T08:00",
              originalName: "avatar.webp",
            },
          ],
        },
        {
          slug: "daily-notes",
          title: "日常切片",
          description: "生活里值得留下的小片段。",
          period: "2026.07",
          coverSrc: "/blog-media/profile/avatar.webp",
          photos: [{
            src: "/blog-media/profile/avatar.webp",
            alt: "日常切片封面",
            caption: "第二个子相册图片",
            width: 640,
            height: 640,
            takenAt: "",
            originalName: "avatar.webp",
          }],
        },
      ],
    }),
  })
  assert.equal(albumSaveResponse.status, 200)
  const savedAlbums = (await albumSaveResponse.json()).albums
  assert.equal(savedAlbums.length, 2)
  assert.equal(savedAlbums[0].sortOrder, 0)
  assert.equal(savedAlbums[0].photoCount, 2)
  assert.equal(savedAlbums[0].photos[0].caption, "后台前移图片")
  assert.equal(savedAlbums[0].photos[0].sortOrder, 0)
  assert.equal(savedAlbums[0].photos[1].alt, "后台新增相册图片")
  assert.equal(savedAlbums[1].slug, "daily-notes")
  assert.equal(savedAlbums[1].sortOrder, 1)
  assert.equal(savedAlbums[1].photoCount, 1)

  const [editedAlbumDirectoryResponse, editedFireflyResponse, dailyAlbumResponse] = await Promise.all([
    request("/mine/album"),
    request("/mine/album/firefly"),
    request("/mine/album/daily-notes"),
  ])
  assert.equal(editedAlbumDirectoryResponse.status, 200)
  assert.equal(editedFireflyResponse.status, 200)
  assert.equal(dailyAlbumResponse.status, 200)
  const [editedAlbumDirectory, editedFirefly, dailyAlbum] = await Promise.all([
    editedAlbumDirectoryResponse.text(),
    editedFireflyResponse.text(),
    dailyAlbumResponse.text(),
  ])
  assert.match(editedAlbumDirectory, /流萤相册/)
  assert.match(editedAlbumDirectory, /日常切片/)
  assert.match(editedAlbumDirectory, /href="\/mine\/album\/daily-notes"/)
  assert.match(editedFirefly, /后台前移图片/)
  assert.match(editedFirefly, /后台新增图片/)
  assert.equal(editedFirefly.match(/class="album-item"/g)?.length, 2)
  assert.match(dailyAlbum, /第二个子相册图片/)
  assert.equal(dailyAlbum.match(/class="album-item"/g)?.length, 1)

  const createBackupResponse = await request("/api/admin/backups", {
    method: "POST",
    headers: { cookie, origin: baseUrl },
  })
  assert.equal(createBackupResponse.status, 201)
  const backup = (await createBackupResponse.json()).backup
  assert.match(backup.name, /^blog-\d{8}-\d{6}\.sqlite$/)
  assert.ok(backup.size > 100)
  const downloadBackupResponse = await request(`/api/admin/backups/${backup.name}`, { headers: { cookie } })
  assert.equal(downloadBackupResponse.status, 200)
  const backupBytes = Buffer.from(await downloadBackupResponse.arrayBuffer())
  assert.equal(backupBytes.subarray(0, 16).toString("utf8"), "SQLite format 3\0")

  const invalidRestoreForm = new FormData()
  invalidRestoreForm.set("file", new Blob([Buffer.alloc(128, 1)], { type: "application/vnd.sqlite3" }), "invalid.sqlite")
  const invalidRestoreResponse = await request("/api/admin/backups/restore", {
    method: "POST",
    headers: { cookie, origin: baseUrl },
    body: invalidRestoreForm,
  })
  assert.equal(invalidRestoreResponse.status, 400)

  const deleteBackupResponse = await request(`/api/admin/backups/${backup.name}`, {
    method: "DELETE",
    headers: { cookie, origin: baseUrl },
  })
  assert.equal(deleteBackupResponse.status, 200)
})

test("supports friend editing, ordering, deletion, and automatic review", async () => {
  const publicResponse = await request("/friends")
  assert.equal(publicResponse.status, 200)
  const publicHtml = await publicResponse.text()
  assert.match(publicHtml, /申请友链/)
  assert.match(publicHtml, /提交并自动审核/)
  assert.match(publicHtml, /双向链接/)

  const cookie = adminCookie()
  const authHeaders = { cookie, origin: baseUrl, "content-type": "application/json" }
  const initialResponse = await request("/api/admin/friends", { headers: { cookie } })
  assert.equal(initialResponse.status, 200)
  const initialFriends = (await initialResponse.json()).friends
  assert.equal(initialFriends.length, 3)
  assert.equal(initialFriends[0].url, "https://blog.xiyy.de/")
  assert.equal(initialFriends[1].url, "https://docs-firefly.cuteleaf.cn/")

  const createResponse = await request("/api/admin/friends", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "后台友链测试",
      url: "https://admin-friend.example.com",
      avatarUrl: "",
      description: "由后台新增并立即公开的友链。",
      backlinkUrl: "",
      status: "approved",
    }),
  })
  assert.equal(createResponse.status, 201)
  const created = (await createResponse.json()).friend
  assert.equal(created.url, "https://admin-friend.example.com/")

  const createdPublicHtml = await (await request("/friends")).text()
  assert.match(createdPublicHtml, /后台友链测试/)

  const updateResponse = await request(`/api/admin/friends/${created.id}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      name: "后台友链已编辑",
      url: created.url,
      avatarUrl: "",
      description: "后台编辑后的友链说明。",
      backlinkUrl: "https://admin-friend.example.com/friends",
      status: "approved",
    }),
  })
  assert.equal(updateResponse.status, 200)
  const updated = (await updateResponse.json()).friend
  assert.equal(updated.name, "后台友链已编辑")
  assert.equal(updated.backlinkUrl, "https://admin-friend.example.com/friends")

  const editedPublicHtml = await (await request("/friends")).text()
  assert.match(editedPublicHtml, /后台友链已编辑/)
  assert.doesNotMatch(editedPublicHtml, /后台友链测试/)

  const moveResponse = await request(`/api/admin/friends/${created.id}/move`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ direction: "up" }),
  })
  assert.equal(moveResponse.status, 200)
  const movedFriends = (await moveResponse.json()).friends
  assert.equal(movedFriends.findIndex((friend) => friend.id === created.id), initialFriends.length - 1)

  const unsafeApplication = await request("/api/friend-applications", {
    method: "POST",
    headers: { origin: baseUrl, "content-type": "application/json", "x-forwarded-for": "198.51.100.20" },
    body: JSON.stringify({
      name: "本机地址",
      url: "https://127.0.0.1/",
      avatarUrl: "",
      description: "不应通过 SSRF 校验。",
      backlinkUrl: "https://127.0.0.1/friends",
      company: "",
    }),
  })
  assert.equal(unsafeApplication.status, 400)
  assert.match(await unsafeApplication.text(), /内网|保留地址|本机/)

  const pendingApplication = await request("/api/friend-applications", {
    method: "POST",
    headers: { origin: baseUrl, "content-type": "application/json", "x-forwarded-for": "203.0.113.20" },
    body: JSON.stringify({
      name: "自动审核待处理",
      url: "https://friend-review.invalid/",
      avatarUrl: "",
      description: "不可解析时应保留到后台，而不是丢失申请。",
      backlinkUrl: "https://friend-review.invalid/friends",
      company: "",
    }),
  })
  assert.equal(pendingApplication.status, 201)
  const pending = (await pendingApplication.json()).application
  assert.equal(pending.status, "pending")
  assert.match(pending.reviewMessage, /无法解析|无法访问|自动审核/)

  const reviewResponse = await request(`/api/admin/friends/${pending.id}/review`, {
    method: "POST",
    headers: { cookie, origin: baseUrl },
  })
  assert.equal(reviewResponse.status, 200)
  const reviewed = await reviewResponse.json()
  assert.equal(reviewed.review.approved, false)
  assert.equal(reviewed.friend.status, "pending")

  const deletePendingResponse = await request(`/api/admin/friends/${pending.id}`, {
    method: "DELETE",
    headers: { cookie, origin: baseUrl },
  })
  assert.equal(deletePendingResponse.status, 200)
  const deleteCreatedResponse = await request(`/api/admin/friends/${created.id}`, {
    method: "DELETE",
    headers: { cookie, origin: baseUrl },
  })
  assert.equal(deleteCreatedResponse.status, 200)

  const finalFriends = (await (await request("/api/admin/friends", { headers: { cookie } })).json()).friends
  assert.equal(finalFriends.length, 3)
})

test("supports threaded comments, likes, reactions, and article isolation", async () => {
  const headers = { origin: baseUrl, "content-type": "application/json" }
  const guestbookResponse = await request("/api/comments", {
    method: "POST",
    headers,
    body: JSON.stringify({ scope: "guestbook", target: "guestbook", nickname: "访客甲", email: "guest@example.com", website: "", avatarUrl: "", content: "这是一条留言簿测试内容。", company: "" }),
  })
  assert.equal(guestbookResponse.status, 201)
  const guestbookRoot = (await guestbookResponse.json()).comment
  assert.equal(guestbookRoot.parentId, null)
  assert.deepEqual(guestbookRoot.likes, { count: 0, active: false })
  assert.equal(guestbookRoot.reactions.length, 4)

  const articleResponse = await request("/api/comments", {
    method: "POST",
    headers,
    body: JSON.stringify({ scope: "article", target: "memos-casdoor-oauth-login", nickname: "读者乙", email: "", website: "https://example.com", avatarUrl: "https://example.com/avatar.png", content: "这是一条文章独立评论。", company: "" }),
  })
  assert.equal(articleResponse.status, 201)

  const replyResponse = await request("/api/comments", {
    method: "POST",
    headers,
    body: JSON.stringify({ scope: "guestbook", target: "guestbook", parentId: guestbookRoot.id, nickname: "访客丙", email: "", website: "", avatarUrl: "", content: "这是第一层回复。", company: "" }),
  })
  assert.equal(replyResponse.status, 201)
  const firstReply = (await replyResponse.json()).comment
  assert.equal(firstReply.parentId, guestbookRoot.id)
  assert.equal(firstReply.replyToNickname, "访客甲")

  const nestedReplyResponse = await request("/api/comments", {
    method: "POST",
    headers,
    body: JSON.stringify({ scope: "guestbook", target: "guestbook", parentId: firstReply.id, nickname: "访客丁", email: "", website: "", avatarUrl: "", content: "这是楼中楼回复。", company: "" }),
  })
  assert.equal(nestedReplyResponse.status, 201)
  const nestedReply = (await nestedReplyResponse.json()).comment
  assert.equal(nestedReply.parentId, firstReply.id)
  assert.equal(nestedReply.replyToNickname, "访客丙")

  const crossThreadReply = await request("/api/comments", {
    method: "POST",
    headers,
    body: JSON.stringify({ scope: "article", target: "memos-casdoor-oauth-login", parentId: guestbookRoot.id, nickname: "跨区回复", email: "", website: "", avatarUrl: "", content: "不允许跨频道回复。", company: "" }),
  })
  assert.equal(crossThreadReply.status, 400)

  const likeResponse = await request(`/api/comments/${guestbookRoot.id}/interactions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ kind: "like" }),
  })
  assert.equal(likeResponse.status, 200)
  const actorCookie = likeResponse.headers.get("set-cookie")?.split(";")[0]
  assert.ok(actorCookie?.startsWith("ruawd_comment_actor="))
  assert.deepEqual((await likeResponse.json()).interaction, { kind: "like", count: 1, active: true })

  const interactionHeaders = { ...headers, cookie: actorCookie }
  const heartResponse = await request(`/api/comments/${guestbookRoot.id}/interactions`, {
    method: "POST",
    headers: interactionHeaders,
    body: JSON.stringify({ kind: "heart" }),
  })
  assert.equal(heartResponse.status, 200)
  assert.deepEqual((await heartResponse.json()).interaction, { kind: "heart", count: 1, active: true })

  const unlikeResponse = await request(`/api/comments/${guestbookRoot.id}/interactions`, {
    method: "POST",
    headers: interactionHeaders,
    body: JSON.stringify({ kind: "like" }),
  })
  assert.equal(unlikeResponse.status, 200)
  assert.deepEqual((await unlikeResponse.json()).interaction, { kind: "like", count: 0, active: false })
  const relikeResponse = await request(`/api/comments/${guestbookRoot.id}/interactions`, {
    method: "POST",
    headers: interactionHeaders,
    body: JSON.stringify({ kind: "like" }),
  })
  assert.equal(relikeResponse.status, 200)

  const invalidReaction = await request(`/api/comments/${guestbookRoot.id}/interactions`, {
    method: "POST",
    headers: interactionHeaders,
    body: JSON.stringify({ kind: "dislike" }),
  })
  assert.equal(invalidReaction.status, 400)
  const crossOriginReaction = await request(`/api/comments/${guestbookRoot.id}/interactions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "like" }),
  })
  assert.equal(crossOriginReaction.status, 403)

  const guestbook = await (await request("/api/comments?scope=guestbook&target=guestbook", { headers: { cookie: actorCookie } })).json()
  const article = await (await request("/api/comments?scope=article&target=memos-casdoor-oauth-login")).json()
  const anotherArticle = await (await request("/api/comments?scope=article&target=another-post")).json()
  assert.equal(guestbook.comments.length, 3)
  assert.equal(article.comments.length, 1)
  assert.equal(anotherArticle.comments.length, 0)
  const publicRoot = guestbook.comments.find((comment) => comment.id === guestbookRoot.id)
  const publicReply = guestbook.comments.find((comment) => comment.id === firstReply.id)
  assert.equal(publicRoot.email, undefined)
  assert.match(publicRoot.avatarUrl, /^\/api\/avatars\/comments\/\d+\?v=2$/)
  assert.deepEqual(publicRoot.likes, { count: 1, active: true })
  assert.deepEqual(publicRoot.reactions.find((reaction) => reaction.kind === "heart"), { kind: "heart", count: 1, active: true })
  assert.equal(publicReply.parentId, guestbookRoot.id)
  assert.equal(publicReply.replyToNickname, "访客甲")
  assert.equal(article.comments[0].avatarUrl, "https://example.com/avatar.png")
  assert.match(article.comments[0].content, /文章独立评论/)

  const anonymousGuestbook = await (await request("/api/comments?scope=guestbook&target=guestbook")).json()
  const anonymousRoot = anonymousGuestbook.comments.find((comment) => comment.id === guestbookRoot.id)
  assert.deepEqual(anonymousRoot.likes, { count: 1, active: false })
  assert.equal(anonymousRoot.reactions.find((reaction) => reaction.kind === "heart").active, false)

  const cookie = adminCookie()
  const adminCommentsResponse = await request("/api/admin/comments", { headers: { cookie } })
  assert.equal(adminCommentsResponse.status, 200)
  const adminComments = (await adminCommentsResponse.json()).comments
  const guestbookAdmin = adminComments.find((comment) => comment.id === guestbookRoot.id)
  assert.equal(guestbookAdmin.email, "guest@example.com")
  assert.equal(guestbookAdmin.likes.count, 1)
  assert.equal(adminComments.find((comment) => comment.id === firstReply.id).replyToNickname, "访客甲")
  const hideResponse = await request(`/api/admin/comments/${guestbookAdmin.id}`, {
    method: "PATCH",
    headers: { cookie, origin: baseUrl, "content-type": "application/json" },
    body: JSON.stringify({ status: "hidden" }),
  })
  assert.equal(hideResponse.status, 200)
  const hiddenGuestbook = await (await request("/api/comments?scope=guestbook&target=guestbook")).json()
  assert.equal(hiddenGuestbook.comments.length, 0)

  const restoreResponse = await request(`/api/admin/comments/${guestbookAdmin.id}`, {
    method: "PATCH",
    headers: { cookie, origin: baseUrl, "content-type": "application/json" },
    body: JSON.stringify({ status: "approved" }),
  })
  assert.equal(restoreResponse.status, 200)
  const restoredGuestbook = await (await request("/api/comments?scope=guestbook&target=guestbook")).json()
  assert.equal(restoredGuestbook.comments.length, 3)

  const deleteRootResponse = await request(`/api/admin/comments/${guestbookRoot.id}`, {
    method: "DELETE",
    headers: { cookie, origin: baseUrl },
  })
  assert.equal(deleteRootResponse.status, 204)
  const afterRootDelete = await (await request("/api/comments?scope=guestbook&target=guestbook")).json()
  assert.equal(afterRootDelete.comments.length, 2)
  assert.equal(afterRootDelete.comments.find((comment) => comment.id === firstReply.id).parentId, null)
  assert.equal(afterRootDelete.comments.find((comment) => comment.id === nestedReply.id).parentId, firstReply.id)

  const newerThreadResponse = await request("/api/comments", {
    method: "POST",
    headers,
    body: JSON.stringify({ scope: "guestbook", target: "guestbook", nickname: "分页访客", email: "", website: "", avatarUrl: "", content: "这是用于验证按根评论分页的新留言。", company: "" }),
  })
  assert.equal(newerThreadResponse.status, 201)
  const newerThread = (await newerThreadResponse.json()).comment
  const firstPage = await (await request("/api/comments?scope=guestbook&target=guestbook&limit=1")).json()
  assert.equal(firstPage.pagination.totalThreads, 2)
  assert.ok(firstPage.pagination.nextCursor)
  assert.equal(firstPage.comments.length, 1)
  assert.equal(firstPage.comments[0].id, newerThread.id)
  const focusedPage = await (await request(`/api/comments?scope=guestbook&target=guestbook&limit=1&focus=${firstReply.id}`)).json()
  assert.ok(focusedPage.comments.some((comment) => comment.id === firstReply.id))
  assert.ok(focusedPage.comments.some((comment) => comment.id === nestedReply.id))

  const articleHtml = await (await request("/blog/memos-casdoor-oauth-login")).text()
  assert.match(articleHtml, /文章评论/)
  assert.match(articleHtml, /邮箱（不公开/)
  assert.match(articleHtml, /头像链接/)
  assert.match(articleHtml, /QQ 头像或 Gravatar/)
  assert.match(articleHtml, /支持楼中楼回复、点赞和表情回应/)
})

test("keeps the editor responsive, stable, and free of emoji controls", async () => {
  const [publicStyles, enhancements, adminStyles, adminEnhancements, editor, albumEditor, homeAvatar, consoleUi, session, codeBlock] = await Promise.all([
    readFile(join(projectRoot, "app", "globals.css"), "utf8"),
    readFile(join(projectRoot, "app", "enhancements.css"), "utf8"),
    readFile(join(projectRoot, "app", "admin", "admin-base.css"), "utf8"),
    readFile(join(projectRoot, "app", "admin", "admin-enhancements.css"), "utf8"),
    readFile(join(projectRoot, "components", "admin-editor.tsx"), "utf8"),
    readFile(join(projectRoot, "components", "admin-album-editor.tsx"), "utf8"),
    readFile(join(projectRoot, "components", "home-avatar.tsx"), "utf8"),
    readFile(join(projectRoot, "components", "admin-console.tsx"), "utf8"),
    readFile(join(projectRoot, "lib", "admin-session.ts"), "utf8"),
    readFile(join(projectRoot, "components", "article-code-block.tsx"), "utf8"),
  ])
  const styles = [publicStyles, enhancements, adminStyles, adminEnhancements].join("\n")

  assert.match(styles, /\.admin-workspace/)
  assert.match(styles, /\.admin-preview/)
  assert.match(styles, /@media \(max-width: 1280px\)/)
  assert.match(styles, /width: clamp\(196px, 52vw, 260px\)/)
  assert.match(styles, /transform 240ms linear/)
  assert.match(homeAvatar, /TextAnimate/)
  assert.match(homeAvatar, /pixelRevealDurationMs = 3_100/)
  assert.match(homeAvatar, /by="character"/)
  assert.match(homeAvatar, /animation="blurInUp"/)
  assert.match(styles, /\.brand > span:last-child[\s\S]*display: inline/)
  assert.match(editor, /实时预览/)
  assert.match(editor, /保存草稿/)
  assert.match(editor, /发布文章/)
  assert.match(editor, /支持 Markdown/)
  assert.match(editor, /解锁并编辑/)
  assert.match(editor, /encryptArticleContent/)
  assert.match(albumEditor, /子相册管理/)
  assert.match(albumEditor, /新增相册/)
  assert.match(albumEditor, /保存全部相册/)
  assert.match(styles, /\.admin-album-collections/)
  assert.match(styles, /\.admin-album-manager \.admin-field input,[\s\S]*font-size: 16px/)
  assert.match(consoleUi, /页面内容/)
  assert.match(consoleUi, /相册/)
  assert.match(consoleUi, /友链/)
  assert.match(consoleUi, /番组 API/)
  assert.match(consoleUi, /留言与评论/)
  assert.match(session, /httpOnly: true/)
  assert.match(session, /sameSite: "lax"/)
  assert.match(styles, /\.article-code-scroll/)
  assert.match(styles, /scrollbar-width: thin/)
  assert.match(codeBlock, /aria-label="代码内容，可横向滚动"/)
  assert.match(codeBlock, /左右滑动查看完整代码/)
})

test("keeps the protected article encrypted in generated source", async () => {
  const generated = await readFile(join(projectRoot, "lib", "blog-posts.generated.ts"), "utf8")
  assert.match(generated, /"protected": true/)
  assert.match(generated, /"algorithm": "AES-GCM"/)
  assert.doesNotMatch(generated, /"password"\s*:/)
})
