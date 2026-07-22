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

test("renders the migrated site identity and real blog index", async () => {
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
  assert.doesNotMatch(blog, /这里暂时放着一些文章样稿/)
})

test("renders a migrated article detail route", async () => {
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
  assert.match(coverHtml, /class="article-cover"/)
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
