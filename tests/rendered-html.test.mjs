import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { after, before, test } from "node:test"

const projectRoot = resolve(import.meta.dirname, "..")
const adminPassword = "test-admin-password"
const adminUsername = "Ruawd"

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
      ADMIN_USERNAME: adminUsername,
      ADMIN_PASSWORD: adminPassword,
      SESSION_SECRET: "test-session-secret-that-is-longer-than-thirty-two-characters",
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

test("renders the site identity and real blog index", async () => {
  const [homeResponse, blogResponse] = await Promise.all([request("/"), request("/blog")])
  assert.equal(homeResponse.status, 200)
  assert.equal(blogResponse.status, 200)

  const [home, blog] = await Promise.all([homeResponse.text(), blogResponse.text()])
  assert.match(home, /Ruawd/)
  assert.match(home, /\/blog-media\/profile\/avatar\.webp/)
  assert.match(home, /data-home-layout="two-x-inspired-v5"/)
  assert.match(home, /class="home-avatar-only"/)
  assert.match(home, /在技术与生活之间，慢慢记录。/)
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
  assert.doesNotMatch(blog, /迁移自原来的 Firefly 博客/)
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
})

test("protects the management backend and supports draft-to-publish workflow", async () => {
  const [adminResponse, apiResponse] = await Promise.all([
    request("/admin"),
    request("/api/admin/posts"),
  ])
  assert.equal(adminResponse.status, 307)
  assert.match(adminResponse.headers.get("location") ?? "", /\/admin\/login/)
  assert.equal(apiResponse.status, 401)

  const loginResponse = await request("/api/admin/session", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ username: adminUsername, password: adminPassword }),
  })
  assert.equal(loginResponse.status, 200)
  const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0]
  assert.ok(cookie)

  const authenticatedAdmin = await request("/admin", { headers: { cookie } })
  assert.equal(authenticatedAdmin.status, 200)
  assert.match(await authenticatedAdmin.text(), /文章管理/)

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
  assert.equal((await request("/blog/integration-test-post")).status, 404)

  const publishResponse = await request("/api/admin/posts/integration-test-post", {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ ...article, status: "published" }),
  })
  assert.equal(publishResponse.status, 200)

  const publishedResponse = await request("/blog/integration-test-post")
  assert.equal(publishedResponse.status, 200)
  const publishedHtml = await publishedResponse.text()
  assert.match(publishedHtml, /后台发布流程测试/)
  assert.match(publishedHtml, /这是通过管理接口写入的测试正文/)
})

test("keeps the editor responsive, stable, and free of emoji controls", async () => {
  const [styles, editor, session] = await Promise.all([
    readFile(join(projectRoot, "app", "globals.css"), "utf8"),
    readFile(join(projectRoot, "components", "admin-editor.tsx"), "utf8"),
    readFile(join(projectRoot, "lib", "admin-session.ts"), "utf8"),
  ])

  assert.match(styles, /\.admin-workspace/)
  assert.match(styles, /\.admin-preview/)
  assert.match(styles, /@media \(max-width: 1280px\)/)
  assert.match(editor, /实时预览/)
  assert.match(editor, /保存草稿/)
  assert.match(editor, /发布文章/)
  assert.match(editor, /支持 Markdown/)
  assert.match(session, /httpOnly: true/)
  assert.match(session, /sameSite: "lax"/)
})

test("keeps the protected article encrypted in generated source", async () => {
  const generated = await readFile(join(projectRoot, "lib", "blog-posts.generated.ts"), "utf8")
  assert.match(generated, /"protected": true/)
  assert.match(generated, /"algorithm": "AES-GCM"/)
  assert.doesNotMatch(generated, /cjaww20040521/)
})
