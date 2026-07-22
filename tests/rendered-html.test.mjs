import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url)
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`)
  const { default: worker } = await import(workerUrl.href)

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  )
}

test("renders the site identity and real blog index", async () => {
  const [homeResponse, blogResponse] = await Promise.all([render("/"), render("/blog")])
  assert.equal(homeResponse.status, 200)
  assert.equal(blogResponse.status, 200)

  const [home, blog] = await Promise.all([homeResponse.text(), blogResponse.text()])
  assert.match(home, /Ruawd/)
  assert.match(home, /\/blog-media\/profile\/avatar\.webp/)
  assert.match(home, /data-home-layout="two-x-inspired-v5"/)
  assert.match(home, /class="home-avatar-only"/)
  assert.match(home, /头像加载中/)
  assert.doesNotMatch(home, />LOADING</)
  assert.doesNotMatch(home, /home-avatar-loader-label/)
  assert.match(home, /在技术与生活之间，慢慢记录。/)
  assert.match(home, /class="home-background home-particle-background"/)
  assert.match(home, /主页快捷入口/)
  assert.match(home, /站内入口/)
  assert.match(home, /阅读博客/)
  assert.match(home, /番组计划/)
  assert.doesNotMatch(home, /WELCOME TO MY PERSONAL SITE/)
  assert.doesNotMatch(home, /的个人站/)
  assert.doesNotMatch(home, /把踩过的坑、用过的服务和想留下的内容认真记录下来/)
  assert.doesNotMatch(home, /Protect what you love/)
  assert.doesNotMatch(home, /从这里开始/)
  assert.match(home, /class="brand"/)
  assert.match(home, /class="brand-avatar"/)
  assert.match(home, /返回主页/)
  assert.doesNotMatch(home, /RUAWD \/ BLOG/)
  assert.doesNotMatch(home, /SINCE 2025/)
  assert.match(blog, /AWS Lightsail JP \$5测试/)
  assert.match(blog, /Stalwart Mail Server 安装与初步配置教程/)
  assert.match(blog, /class="post-cover"/)
  assert.match(blog, /width="800" height="600"/)
  assert.match(blog, /dateTime="2026-06-26"/)
  assert.match(blog, /VPS 测评/)
  assert.match(blog, /VPS测评/)
  assert.match(blog, /class="post-tags" aria-label="文章标签"/)
  assert.match(blog, /技术实践、VPS 测评与数字生活记录。/)
  assert.doesNotMatch(blog, /迁移自原来的 Firefly 博客/)
  assert.doesNotMatch(blog, /这里暂时放着一些文章样稿/)
})

test("renders an article detail route", async () => {
  const [response, coverResponse] = await Promise.all([
    render("/blog/memos-casdoor-oauth-login"),
    render("/blog/aws-lightsail-jp-5-review"),
  ])
  assert.equal(response.status, 200)
  assert.equal(coverResponse.status, 200)
  const html = await response.text()
  const coverHtml = await coverResponse.text()
  assert.match(html, /在 Memos 中接入 Casdoor 登录并获取用户信息/)
  assert.match(html, /Casdoor Application 配置/)
  assert.match(html, /class="article-reading-layout"/)
  assert.match(html, /class="article-toc" aria-label="文章目录"/)
  assert.match(html, /class="article-progress"/)
  assert.match(html, /aria-label="返回顶部"/)
  assert.match(html, /aria-label="直达评论"/)
  assert.match(html, /复制文章链接/)
  assert.match(html, /id="article-comments"/)
  assert.match(coverHtml, /class="site-shell article-shell"/)
  assert.match(coverHtml, /class="article-cover"/)
})

test("keeps blog hover feedback layout-stable", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8")
  assert.match(styles, /aspect-ratio: 4 \/ 3;/)
  assert.match(styles, /\.post-card::before/)
  assert.match(styles, /transform: scaleX\(0\);/)
  assert.match(styles, /transform: scale\(1\.045\);/)
  assert.match(styles, /transform: translateX\(6px\);/)
  assert.doesNotMatch(styles, /\.post-card:hover\s*\{[^}]*padding-inline:/)
  assert.match(styles, /\.post-card:hover \.post-cover/)
  assert.match(styles, /\.post-card:hover \.post-read-link svg/)
})

test("keeps article pages compact and readable", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8")
  const articleCoverRule = styles.match(/\.article-cover\s*\{([^}]*)\}/)?.[1] ?? ""
  assert.match(styles, /\.article-shell \.page-hero-copy h1/)
  assert.match(styles, /font-size: clamp\(2\.75rem, 5\.25vw, 5\.75rem\);/)
  assert.match(styles, /line-height: 1\.08;/)
  assert.match(styles, /max-height: min\(54svh, 560px\);/)
  assert.match(articleCoverRule, /object-fit: cover;/)
  assert.doesNotMatch(articleCoverRule, /object-fit: contain;/)
  assert.match(styles, /\.article-toc\s*\{[\s\S]*?position: sticky;/)
  assert.match(styles, /\.article-progress\s*\{[\s\S]*?position: fixed;/)
  assert.match(styles, /\.article-actions\s*\{[\s\S]*?position: fixed;/)
})

test("keeps the protected article encrypted in generated source", async () => {
  const generated = await readFile(
    new URL("../lib/blog-posts.generated.ts", import.meta.url),
    "utf8",
  )
  assert.match(generated, /"protected": true/)
  assert.match(generated, /"algorithm": "AES-GCM"/)
  assert.match(generated, /https:\/\/i\.111666\.best\/image\//)
  assert.doesNotMatch(generated, /\/blog-media\/remote\//)
  assert.doesNotMatch(generated, /cjaww20040521/)
})

test("renders the protected article as a password prompt", async () => {
  const response = await render("/blog/poste-io-mail-server-guide")
  assert.equal(response.status, 200)
  const html = await response.text()
  assert.match(html, /这篇文章受密码保护/)
  assert.doesNotMatch(html, /原文来自：https:\/\/blog\.lufei\.de/)
})
