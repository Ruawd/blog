import type { DatabaseSync } from "node:sqlite"
import { unstable_cache } from "next/cache"

import { getDatabase } from "@/db"
import type { ArticleInput, ArticleStatus, ArticleSummary, EditableArticle } from "@/lib/blog-types"
import {
  blogPosts,
  getBlogPost,
  type BlogPost,
  type EncryptedBlogContent,
} from "@/lib/blog-posts.generated"
import { publicCacheTags } from "@/lib/public-cache"

type StoredPostRow = {
  slug: string
  title: string
  description: string
  content: string
  category: string
  tagsJson: string
  image: string | null
  sourceLink: string | null
  status: ArticleStatus
  publishedAt: string
  scheduledAt: string | null
  readingMinutes: number
  protected: number
  encryptedJson: string | null
  passwordHint: string | null
  createdAt: string
  updatedAt: string
}

export type PostRevisionSummary = {
  id: number
  slug: string
  title: string
  status: ArticleStatus
  updatedBy: string
  createdAt: string
}

export type PostAutosave = {
  slug: string
  article: EditableArticle
  updatedAt: string
}

let schemaReady = false

const postSelect = `
  SELECT
    slug,
    title,
    description,
    content,
    category,
    tags_json AS tagsJson,
    image,
    source_link AS sourceLink,
    status,
    published_at AS publishedAt,
    scheduled_at AS scheduledAt,
    reading_minutes AS readingMinutes,
    protected,
    encrypted_json AS encryptedJson,
    password_hint AS passwordHint,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM posts
`

export function ensureBlogSchema(): DatabaseSync {
  const db = getDatabase()
  if (!schemaReady) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT '随笔',
        tags_json TEXT NOT NULL DEFAULT '[]',
        image TEXT,
        source_link TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        published_at TEXT NOT NULL,
        scheduled_at TEXT,
        reading_minutes INTEGER NOT NULL DEFAULT 1,
        protected INTEGER NOT NULL DEFAULT 0,
        encrypted_json TEXT,
        password_hint TEXT,
        author_email TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_unique ON posts (slug);
      CREATE INDEX IF NOT EXISTS posts_status_published_idx ON posts (status, published_at);
      CREATE TABLE IF NOT EXISTS post_revisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS post_revisions_slug_created_idx
        ON post_revisions (slug, created_at DESC, id DESC);
      CREATE TABLE IF NOT EXISTS post_autosaves (
        slug TEXT PRIMARY KEY,
        snapshot_json TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    const columns = new Set(
      (db.prepare("PRAGMA table_info(posts)").all() as unknown as Array<{ name: string }>)
        .map((column) => column.name),
    )
    if (!columns.has("protected")) {
      db.exec("ALTER TABLE posts ADD COLUMN protected INTEGER NOT NULL DEFAULT 0")
    }
    if (!columns.has("encrypted_json")) {
      db.exec("ALTER TABLE posts ADD COLUMN encrypted_json TEXT")
    }
    if (!columns.has("password_hint")) {
      db.exec("ALTER TABLE posts ADD COLUMN password_hint TEXT")
    }
    if (!columns.has("scheduled_at")) {
      db.exec("ALTER TABLE posts ADD COLUMN scheduled_at TEXT")
    }
    schemaReady = true
  }
  return db
}

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : []
  } catch {
    return []
  }
}

function normalizeEncryptedContent(value: unknown): EncryptedBlogContent {
  if (!value || typeof value !== "object") throw new Error("加密正文格式不正确")
  const encrypted = value as Record<string, unknown>
  const iterations = encrypted.iterations
  const salt = encrypted.salt
  const iv = encrypted.iv
  const payload = encrypted.payload
  const base64 = /^[A-Za-z0-9+/]+={0,2}$/

  if (encrypted.algorithm !== "AES-GCM") throw new Error("只支持 AES-GCM 加密正文")
  if (typeof iterations !== "number" || !Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) {
    throw new Error("加密迭代次数不正确")
  }
  if (typeof salt !== "string" || salt.length > 128 || !base64.test(salt)) throw new Error("加密盐值不正确")
  if (typeof iv !== "string" || iv.length > 128 || !base64.test(iv)) throw new Error("加密向量不正确")
  if (typeof payload !== "string" || payload.length > 2_400_000 || !base64.test(payload)) {
    throw new Error("加密正文内容不正确")
  }

  return {
    algorithm: "AES-GCM",
    iterations,
    salt,
    iv,
    payload,
  }
}

function parseEncryptedContent(value: string | null): EncryptedBlogContent | undefined {
  if (!value) return undefined
  try {
    return normalizeEncryptedContent(JSON.parse(value))
  } catch {
    return undefined
  }
}

function storedToEditable(row: StoredPostRow): EditableArticle {
  const protectedPost = row.protected === 1
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    content: protectedPost ? "" : row.content,
    category: row.category,
    tags: parseTags(row.tagsJson),
    image: row.image ?? "",
    sourceLink: row.sourceLink ?? "",
    status: row.status,
    published: row.publishedAt,
    scheduledAt: row.scheduledAt ?? "",
    updated: row.updatedAt.slice(0, 10),
    readingMinutes: row.readingMinutes,
    source: "database",
    editable: true,
    protected: protectedPost,
    passwordHint: row.passwordHint ?? "",
    encrypted: protectedPost ? parseEncryptedContent(row.encryptedJson) : undefined,
  }
}

function staticToEditable(post: BlogPost): EditableArticle {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    content: post.protected ? "" : post.content ?? "",
    category: post.category,
    tags: post.tags,
    image: post.image ?? "",
    sourceLink: post.sourceLink ?? "",
    status: "published",
    published: post.published,
    scheduledAt: "",
    updated: post.updated ?? post.published,
    readingMinutes: post.readingMinutes,
    source: "static",
    editable: true,
    protected: post.protected,
    passwordHint: post.passwordHint ?? "",
    encrypted: post.encrypted,
  }
}

function editableToBlogPost(post: EditableArticle): BlogPost {
  return {
    slug: post.slug,
    title: post.title,
    published: post.published,
    updated: post.updated,
    description: post.description,
    image: post.image || undefined,
    tags: post.tags,
    category: post.category,
    sourceLink: post.sourceLink || undefined,
    readingMinutes: post.readingMinutes,
    protected: post.protected,
    passwordHint: post.passwordHint || undefined,
    content: post.protected ? undefined : post.content,
    encrypted: post.protected ? post.encrypted : undefined,
  }
}

function editableToSummary(post: EditableArticle): ArticleSummary {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    category: post.category,
    tags: post.tags,
    image: post.image,
    status: post.status,
    published: post.published,
    scheduledAt: post.scheduledAt,
    updated: post.updated,
    readingMinutes: post.readingMinutes,
    source: post.source,
    editable: post.editable,
    protected: post.protected,
    passwordHint: post.passwordHint,
  }
}

async function listStoredPosts(): Promise<StoredPostRow[]> {
  const db = ensureBlogSchema()
  return db.prepare(`${postSelect} ORDER BY datetime(updated_at) DESC`).all() as unknown as StoredPostRow[]
}

async function getStoredPost(slug: string): Promise<StoredPostRow | null> {
  const db = ensureBlogSchema()
  const row = db.prepare(`${postSelect} WHERE slug = ? LIMIT 1`).get(slug) as unknown as StoredPostRow | undefined
  return row ?? null
}

function storedPostIsPublic(post: StoredPostRow): boolean {
  if (post.status === "published") return true
  if (post.status !== "scheduled" || !post.scheduledAt) return false
  const timestamp = Date.parse(`${post.scheduledAt}:00+08:00`)
  return Number.isFinite(timestamp) && timestamp <= Date.now()
}

async function listPublishedBlogPostsUncached(): Promise<BlogPost[]> {
  const merged = new Map(blogPosts.map((post) => [post.slug, post]))

  for (const stored of await listStoredPosts()) {
    if (!storedPostIsPublic(stored)) {
      merged.delete(stored.slug)
      continue
    }
    merged.set(stored.slug, editableToBlogPost(storedToEditable(stored)))
  }

  return [...merged.values()].sort((a, b) => b.published.localeCompare(a.published))
}

async function getPublishedBlogPostUncached(slug: string): Promise<BlogPost | null> {
  const stored = await getStoredPost(slug)
  if (stored) return storedPostIsPublic(stored) ? editableToBlogPost(storedToEditable(stored)) : null
  return getBlogPost(slug) ?? null
}

const listPublishedBlogPostsCached = unstable_cache(
  listPublishedBlogPostsUncached,
  ["published-blog-posts-v1"],
  { revalidate: 300, tags: [publicCacheTags.blog] },
)

const getPublishedBlogPostCached = unstable_cache(
  getPublishedBlogPostUncached,
  ["published-blog-post-v1"],
  { revalidate: 300, tags: [publicCacheTags.blog] },
)

export async function listPublishedBlogPosts(): Promise<BlogPost[]> {
  return listPublishedBlogPostsCached()
}

export async function getPublishedBlogPost(slug: string): Promise<BlogPost | null> {
  return getPublishedBlogPostCached(slug)
}

export async function listEditableArticleSummaries(): Promise<ArticleSummary[]> {
  const merged = new Map<string, EditableArticle>(
    blogPosts.map((post) => [post.slug, staticToEditable(post)]),
  )

  for (const stored of await listStoredPosts()) {
    merged.set(stored.slug, storedToEditable(stored))
  }

  return [...merged.values()]
    .sort((a, b) => b.updated.localeCompare(a.updated))
    .map(editableToSummary)
}

export async function getEditableArticle(slug: string): Promise<EditableArticle | null> {
  const stored = await getStoredPost(slug)
  if (stored) return storedToEditable(stored)
  const post = getBlogPost(slug)
  return post ? staticToEditable(post) : null
}

export function estimateReadingMinutes(content: string): number {
  const chineseCharacters = (content.match(/[\u3400-\u9fff]/g) ?? []).length
  const latinWords = (content.replace(/[\u3400-\u9fff]/g, " ").match(/[\p{L}\p{N}]+/gu) ?? []).length
  return Math.max(1, Math.ceil(chineseCharacters / 400 + latinWords / 220))
}

export function normalizeArticleInput(value: unknown): ArticleInput {
  if (!value || typeof value !== "object") throw new Error("文章数据格式不正确")
  const input = value as Record<string, unknown>
  const string = (key: string) => typeof input[key] === "string" ? input[key].trim() : ""
  const slug = string("slug").toLowerCase()
  const title = string("title")
  const published = string("published")
  const status: ArticleStatus = input.status === "published"
    ? "published"
    : input.status === "scheduled"
      ? "scheduled"
      : "draft"
  const protectedPost = input.protected === true
  const tags = Array.isArray(input.tags)
    ? [...new Set(input.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean))]
    : []

  const validateOptionalUrl = (key: "image" | "sourceLink") => {
    const url = string(key)
    if (!url) return ""
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error()
      return url
    } catch {
      throw new Error(key === "image" ? "封面图片必须是有效的 HTTP(S) 地址" : "来源链接必须是有效的 HTTP(S) 地址")
    }
  }

  if (!slug || !/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(slug)) {
    throw new Error("链接标识只能包含文字、数字和连字符，且不能以连字符开头或结尾")
  }
  if (!title) throw new Error("请填写文章标题")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(published)) throw new Error("发布日期格式不正确")
  const scheduledAt = string("scheduledAt")
  if (status === "scheduled" && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(scheduledAt)) {
    throw new Error("定时发布时间格式不正确")
  }
  if (slug.length > 120) throw new Error("链接标识不能超过 120 个字符")
  if (title.length > 180) throw new Error("文章标题不能超过 180 个字符")
  if (string("description").length > 500) throw new Error("文章摘要不能超过 500 个字符")
  if (string("category").length > 60) throw new Error("文章分类不能超过 60 个字符")
  if (tags.length > 20 || tags.some((tag) => tag.length > 50)) throw new Error("标签最多 20 个，每个不能超过 50 个字符")
  if ((typeof input.content === "string" ? input.content.length : 0) > 2_000_000) throw new Error("文章正文不能超过 200 万个字符")

  const encrypted = protectedPost ? normalizeEncryptedContent(input.encrypted) : undefined
  const readingMinutes = protectedPost ? Number(input.readingMinutes) : estimateReadingMinutes(
    typeof input.content === "string" ? input.content : "",
  )
  if (!Number.isInteger(readingMinutes) || readingMinutes < 1 || readingMinutes > 10_000) {
    throw new Error("文章阅读时长不正确")
  }

  return {
    slug,
    title,
    description: string("description"),
    content: protectedPost ? "" : typeof input.content === "string" ? input.content : "",
    category: string("category") || "随笔",
    tags,
    image: validateOptionalUrl("image"),
    sourceLink: validateOptionalUrl("sourceLink"),
    status,
    published,
    scheduledAt: status === "scheduled" ? scheduledAt : "",
    protected: protectedPost,
    passwordHint: string("passwordHint").slice(0, 200),
    readingMinutes,
    encrypted,
  }
}

export async function articleExists(slug: string): Promise<boolean> {
  if (getBlogPost(slug)) return true
  return Boolean(await getStoredPost(slug))
}

function editableToInput(article: EditableArticle): ArticleInput {
  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    content: article.protected ? "" : article.content,
    category: article.category,
    tags: article.tags,
    image: article.image,
    sourceLink: article.sourceLink,
    status: article.status,
    published: article.published,
    scheduledAt: article.scheduledAt,
    protected: article.protected,
    passwordHint: article.passwordHint,
    readingMinutes: article.readingMinutes,
    encrypted: article.encrypted,
  }
}

function recordRevision(db: DatabaseSync, article: EditableArticle, username: string): void {
  db.prepare(`
    INSERT INTO post_revisions (slug, snapshot_json, updated_by, created_at)
    VALUES (?, ?, ?, ?)
  `).run(article.slug, JSON.stringify(editableToInput(article)), username, new Date().toISOString())
  db.prepare(`
    DELETE FROM post_revisions
    WHERE slug = ? AND id NOT IN (
      SELECT id FROM post_revisions WHERE slug = ? ORDER BY datetime(created_at) DESC, id DESC LIMIT 50
    )
  `).run(article.slug, article.slug)
}

export async function saveArticle(
  input: ArticleInput,
  email: string,
  options: { recordRevision?: boolean } = {},
): Promise<EditableArticle> {
  const db = ensureBlogSchema()
  const now = new Date().toISOString()
  const readingMinutes = input.protected ? input.readingMinutes : estimateReadingMinutes(input.content)
  const current = options.recordRevision === false ? null : await getEditableArticle(input.slug)
  if (current) {
    const previous = JSON.stringify(editableToInput(current))
    const next = JSON.stringify({ ...input, readingMinutes })
    if (previous !== next) recordRevision(db, current, email)
  }

  db.prepare(`
    INSERT INTO posts (
      slug, title, description, content, category, tags_json, image, source_link,
      status, published_at, reading_minutes, protected, encrypted_json, password_hint,
      scheduled_at, author_email, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      content = excluded.content,
      category = excluded.category,
      tags_json = excluded.tags_json,
      image = excluded.image,
      source_link = excluded.source_link,
      status = excluded.status,
      published_at = excluded.published_at,
      scheduled_at = excluded.scheduled_at,
      reading_minutes = excluded.reading_minutes,
      protected = excluded.protected,
      encrypted_json = excluded.encrypted_json,
      password_hint = excluded.password_hint,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `).run(
    input.slug,
    input.title,
    input.description,
    input.protected ? "" : input.content,
    input.category,
    JSON.stringify(input.tags),
    input.image || null,
    input.sourceLink || null,
    input.status,
    input.published,
    readingMinutes,
    input.protected ? 1 : 0,
    input.protected ? JSON.stringify(input.encrypted) : null,
    input.protected ? input.passwordHint || null : null,
    input.status === "scheduled" ? input.scheduledAt : null,
    email,
    email,
    now,
    now,
  )

  db.prepare("DELETE FROM post_autosaves WHERE slug = ?").run(input.slug)

  const saved = await getEditableArticle(input.slug)
  if (!saved) throw new Error("文章保存后未能重新读取")
  return saved
}

function revisionSnapshot(id: number, slug: string): ArticleInput | null {
  const row = ensureBlogSchema().prepare(`
    SELECT snapshot_json AS snapshotJson FROM post_revisions
    WHERE id = ? AND slug = ? LIMIT 1
  `).get(id, slug) as { snapshotJson: string } | undefined
  if (!row) return null
  try {
    return normalizeArticleInput(JSON.parse(row.snapshotJson))
  } catch {
    return null
  }
}

export function listPostRevisions(slug: string): PostRevisionSummary[] {
  const rows = ensureBlogSchema().prepare(`
    SELECT id, slug, snapshot_json AS snapshotJson, updated_by AS updatedBy, created_at AS createdAt
    FROM post_revisions WHERE slug = ?
    ORDER BY datetime(created_at) DESC, id DESC LIMIT 50
  `).all(slug) as unknown as Array<{ id: number; slug: string; snapshotJson: string; updatedBy: string; createdAt: string }>
  return rows.flatMap((row) => {
    try {
      const snapshot = JSON.parse(row.snapshotJson) as Partial<ArticleInput>
      return [{
        id: row.id,
        slug: row.slug,
        title: typeof snapshot.title === "string" ? snapshot.title : row.slug,
        status: snapshot.status === "published" || snapshot.status === "scheduled" ? snapshot.status : "draft",
        updatedBy: row.updatedBy,
        createdAt: row.createdAt,
      }]
    } catch {
      return []
    }
  })
}

export async function restorePostRevision(id: number, slug: string, username: string): Promise<EditableArticle | null> {
  if (!Number.isSafeInteger(id) || id < 1) return null
  const snapshot = revisionSnapshot(id, slug)
  if (!snapshot) return null
  return saveArticle(snapshot, username)
}

function parseAutosave(row: { slug: string; snapshotJson: string; updatedAt: string } | undefined): PostAutosave | null {
  if (!row) return null
  try {
    const article = JSON.parse(row.snapshotJson) as EditableArticle
    if (!article || article.slug !== row.slug || article.protected || typeof article.content !== "string") return null
    return { slug: row.slug, article: { ...article, scheduledAt: article.scheduledAt || "" }, updatedAt: row.updatedAt }
  } catch {
    return null
  }
}

export function getPostAutosave(slug: string): PostAutosave | null {
  const row = ensureBlogSchema().prepare(`
    SELECT slug, snapshot_json AS snapshotJson, updated_at AS updatedAt
    FROM post_autosaves WHERE slug = ? LIMIT 1
  `).get(slug) as { slug: string; snapshotJson: string; updatedAt: string } | undefined
  return parseAutosave(row)
}

export function savePostAutosave(slug: string, value: unknown, username: string): PostAutosave {
  if (!value || typeof value !== "object") throw new Error("自动保存内容格式不正确")
  const article = value as EditableArticle
  if (article.slug !== slug || article.protected) throw new Error("这篇文章不能自动保存到服务器")
  if (typeof article.content !== "string" || article.content.length > 2_000_000) throw new Error("自动保存正文过大")
  if (typeof article.title !== "string" || article.title.length > 180) throw new Error("自动保存标题不正确")
  const snapshot = JSON.stringify({ ...article, scheduledAt: article.scheduledAt || "" })
  if (snapshot.length > 2_400_000) throw new Error("自动保存内容过大")
  const now = new Date().toISOString()
  ensureBlogSchema().prepare(`
    INSERT INTO post_autosaves (slug, snapshot_json, updated_by, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      snapshot_json = excluded.snapshot_json,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `).run(slug, snapshot, username, now)
  const saved = getPostAutosave(slug)
  if (!saved) throw new Error("自动保存失败")
  return saved
}

export function deletePostAutosave(slug: string): void {
  ensureBlogSchema().prepare("DELETE FROM post_autosaves WHERE slug = ?").run(slug)
}
