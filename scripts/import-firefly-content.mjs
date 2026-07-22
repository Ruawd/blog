import {
  createCipheriv,
  pbkdf2Sync,
  randomBytes,
} from "node:crypto"
import {
  copyFile,
  cp,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const sourceRoot = process.argv[2]

if (!sourceRoot) {
  throw new Error("Usage: node scripts/import-firefly-content.mjs <Firefly-blog root>")
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourcePosts = path.join(sourceRoot, "src", "content", "posts")
const publicMedia = path.join(projectRoot, "public", "blog-media")
const generatedFile = path.join(projectRoot, "lib", "blog-posts.generated.ts")
const excludedSlugs = new Set(["encrypted-demo", "markdown-plantuml"])
const unavailableRemoteImages = new Set([
  "https://sls.ruawd.top/uploads/20251117/41d19079b12717938a8a1af9ea5e47e6.webp",
  "https://sls.ruawd.top/uploads/20251117/a73d8291ff8139fa4f9686cc558cf366.webp",
  "https://sls.ruawd.top/uploads/20251117/e3517ddb81e22edc764c56019a46b36d.webp",
])

function unquote(value) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) throw new Error("Missing frontmatter")

  const data = {}
  const lines = match[1].split(/\r?\n/)
  let activeList = null

  for (const line of lines) {
    const listItem = line.match(/^\s+-\s+(.+)$/)
    if (listItem && activeList) {
      data[activeList].push(unquote(listItem[1]))
      continue
    }

    const field = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/)
    if (!field) continue

    const [, key, rawValue] = field
    const value = unquote(rawValue)

    if (!value) {
      activeList = key
      data[key] = []
    } else if (value.startsWith("[") && value.endsWith("]")) {
      activeList = null
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((item) => unquote(item))
        .filter(Boolean)
    } else {
      activeList = null
      data[key] = value
    }
  }

  return { data, content: match[2].trim() }
}

async function rewriteMarkdownImages(markdown) {
  const pattern = /(!\[[^\]]*\]\()([^\s)]+)(\))/g
  const matches = [...markdown.matchAll(pattern)]
  let rewritten = markdown

  for (const match of matches) {
    const original = match[2]
    let replacement = original

    if (unavailableRemoteImages.has(original)) {
      replacement = "/blog-media/image-unavailable.svg"
    } else if (original.startsWith("../../assets/images/")) {
      replacement = `/blog-media/assets/${original.slice("../../assets/images/".length)}`
    }

    rewritten = rewritten.replace(match[0], `${match[1]}${replacement}${match[3]}`)
  }

  return rewritten
}

function encryptContent(content, password) {
  const iterations = 180_000
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = pbkdf2Sync(password, salt, iterations, 32, "sha256")
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(content, "utf8"), cipher.final()])
  const payload = Buffer.concat([encrypted, cipher.getAuthTag()])

  return {
    algorithm: "AES-GCM",
    iterations,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    payload: payload.toString("base64"),
  }
}

const files = (await readdir(sourcePosts, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
  .map((entry) => entry.name)
  .sort()

const posts = []

for (const filename of files) {
  const source = await readFile(path.join(sourcePosts, filename), "utf8")
  const { data, content: originalContent } = parseFrontmatter(source)
  const slug = data.slug || filename.replace(/\.md$/, "")

  if (excludedSlugs.has(slug) || data.category === "文章示例") continue

  const content = await rewriteMarkdownImages(originalContent)
  // Keep article covers on the author's existing image host. Inlining every
  // full-resolution cover makes the source repository unnecessarily large.
  const image = data.image || undefined
  const protectedPost = Boolean(data.password)
  const readingMinutes = Math.max(1, Math.ceil(content.replace(/```[\s\S]*?```/g, "").length / 500))

  posts.push({
    slug,
    title: data.title,
    published: data.published,
    updated: data.updated || undefined,
    description: data.description || "",
    image,
    tags: Array.isArray(data.tags) ? data.tags : [],
    category: data.category || "未分类",
    sourceLink: data.sourceLink || undefined,
    readingMinutes,
    protected: protectedPost,
    passwordHint: data.passwordHint || undefined,
    content: protectedPost ? undefined : content,
    encrypted: protectedPost ? encryptContent(content, data.password) : undefined,
  })
}

posts.sort((a, b) => b.published.localeCompare(a.published))

for (const directory of ["poste-io-guide", "stalwart-guide"]) {
  await cp(
    path.join(sourceRoot, "src", "assets", "images", directory),
    path.join(publicMedia, "assets", directory),
    { recursive: true, force: true },
  )
}
await cp(
  path.join(sourceRoot, "public", "gallery", "firefly-2026"),
  path.join(publicMedia, "gallery", "firefly-2026"),
  { recursive: true, force: true },
)
await mkdir(path.join(publicMedia, "profile"), { recursive: true })
await copyFile(
  path.join(sourceRoot, "src", "assets", "images", "avatar.avif"),
  path.join(publicMedia, "profile", "avatar.avif"),
)
await mkdir(path.join(publicMedia, "sponsor"), { recursive: true })
for (const filename of ["alipay.png", "wechat.png"]) {
  await copyFile(
    path.join(sourceRoot, "public", "assets", "images", "sponsor", filename),
    path.join(publicMedia, "sponsor", filename),
  )
}

const generated = `/* This file is generated by scripts/import-firefly-content.mjs. */
export type EncryptedBlogContent = {
  algorithm: "AES-GCM"
  iterations: number
  salt: string
  iv: string
  payload: string
}

export type BlogPost = {
  slug: string
  title: string
  published: string
  updated?: string
  description: string
  image?: string
  tags: string[]
  category: string
  sourceLink?: string
  readingMinutes: number
  protected: boolean
  passwordHint?: string
  content?: string
  encrypted?: EncryptedBlogContent
}

export const blogPosts: BlogPost[] = ${JSON.stringify(posts, null, 2)}

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug)
}
`

await writeFile(generatedFile, generated, "utf8")

console.log(JSON.stringify({
  posts: posts.length,
  protectedPosts: posts.filter((post) => post.protected).length,
  remoteImagesPreserved: posts.reduce(
    (count, post) => count + ((post.content || "").match(/https:\/\/i\.111666\.best\/image\//g)?.length || 0),
    0,
  ),
}, null, 2))
