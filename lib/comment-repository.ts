import { createHmac } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"

import { getDatabase } from "@/db"

export type CommentScope = "guestbook" | "article"
export type CommentStatus = "approved" | "hidden"
export type PublicComment = {
  id: number
  scope: CommentScope
  target: string
  nickname: string
  website: string
  avatarUrl: string
  content: string
  createdAt: string
}
export type AdminComment = PublicComment & { email: string; status: CommentStatus }

type CommentRow = {
  id: number
  scope: CommentScope
  target: string
  nickname: string
  email: string
  website: string
  avatarUrl: string
  content: string
  status: CommentStatus
  createdAt: string
}
let schemaReady = false

function ensureCommentSchema(): DatabaseSync {
  const db = getDatabase()
  if (!schemaReady) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scope TEXT NOT NULL,
        target TEXT NOT NULL,
        nickname TEXT NOT NULL,
        email TEXT,
        website TEXT,
        avatar_url TEXT,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'approved',
        ip_hash TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS comments_scope_target_idx
      ON comments (scope, target, status, created_at);
    `)
    const columns = db.prepare("PRAGMA table_info(comments)").all() as unknown as Array<{ name: string }>
    if (!columns.some((column) => column.name === "avatar_url")) {
      db.exec("ALTER TABLE comments ADD COLUMN avatar_url TEXT")
    }
    schemaReady = true
  }
  return db
}

const select = `SELECT id, scope, target, nickname, COALESCE(email, '') AS email,
  COALESCE(website, '') AS website, COALESCE(avatar_url, '') AS avatarUrl,
  content, status, created_at AS createdAt FROM comments`

function validateScope(value: unknown): CommentScope {
  if (value === "guestbook" || value === "article") return value
  throw new Error("评论频道不正确")
}

function validateTarget(scope: CommentScope, value: unknown): string {
  const target = typeof value === "string" ? value.trim() : ""
  if (scope === "guestbook") return "guestbook"
  if (!target || target.length > 120 || !/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(target)) {
    throw new Error("文章标识不正确")
  }
  return target
}

function optionalUrl(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : ""
  if (!text) return ""
  try {
    const url = new URL(text)
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error()
    return url.toString()
  } catch {
    throw new Error("个人网站必须是有效的 HTTP(S) 地址")
  }
}

function optionalAvatarUrl(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : ""
  if (!text) return ""
  if (text.length > 1000) throw new Error("头像链接过长")
  try {
    const url = new URL(text)
    if (url.protocol !== "https:") throw new Error()
    if (url.username || url.password) throw new Error()
    url.hash = ""
    return url.toString()
  } catch {
    throw new Error("头像链接必须是有效的 HTTPS 地址")
  }
}

function publicAvatarUrl(row: CommentRow): string {
  if (row.avatarUrl) return row.avatarUrl
  return row.email ? `/api/avatars/comments/${row.id}` : ""
}

function toPublicComment(row: CommentRow): PublicComment {
  return {
    id: row.id,
    scope: row.scope,
    target: row.target,
    nickname: row.nickname,
    website: row.website,
    avatarUrl: publicAvatarUrl(row),
    content: row.content,
    createdAt: row.createdAt,
  }
}

function toAdminComment(row: CommentRow): AdminComment {
  return {
    ...toPublicComment(row),
    email: row.email,
    status: row.status,
  }
}

export function normalizeComment(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("留言格式不正确")
  const input = value as Record<string, unknown>
  const scope = validateScope(input.scope)
  const target = validateTarget(scope, input.target)
  const nickname = typeof input.nickname === "string" ? input.nickname.trim() : ""
  const email = typeof input.email === "string" ? input.email.trim() : ""
  const content = typeof input.content === "string" ? input.content.trim() : ""
  if (typeof input.company === "string" && input.company.trim()) throw new Error("留言校验失败")
  if (nickname.length < 2 || nickname.length > 40) throw new Error("昵称需要 2–40 个字符")
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120)) throw new Error("邮箱格式不正确")
  if (content.length < 2 || content.length > 2000) throw new Error("内容需要 2–2000 个字符")
  return {
    scope,
    target,
    nickname,
    email,
    website: optionalUrl(input.website),
    avatarUrl: optionalAvatarUrl(input.avatarUrl),
    content,
  }
}

export async function listPublicComments(scopeValue: unknown, targetValue: unknown): Promise<PublicComment[]> {
  const scope = validateScope(scopeValue)
  const target = validateTarget(scope, targetValue)
  const rows = ensureCommentSchema().prepare(`${select} WHERE scope = ? AND target = ? AND status = 'approved' ORDER BY datetime(created_at) DESC`).all(scope, target) as unknown as CommentRow[]
  return rows.map(toPublicComment)
}

export async function createComment(value: unknown, ipAddress: string): Promise<PublicComment> {
  const input = normalizeComment(value)
  const now = new Date().toISOString()
  const secret = process.env.SESSION_SECRET || "local-comment-hash"
  const ipHash = createHmac("sha256", secret).update(ipAddress).digest("hex")
  const result = ensureCommentSchema().prepare(`
    INSERT INTO comments (scope, target, nickname, email, website, avatar_url, content, status, ip_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?)
  `).run(
    input.scope,
    input.target,
    input.nickname,
    input.email || null,
    input.website || null,
    input.avatarUrl || null,
    input.content,
    ipHash,
    now,
    now,
  )
  const row = ensureCommentSchema().prepare(`${select} WHERE id = ?`).get(Number(result.lastInsertRowid)) as unknown as CommentRow
  return toPublicComment(row)
}

export async function listAdminComments(): Promise<AdminComment[]> {
  const rows = ensureCommentSchema().prepare(`${select} ORDER BY datetime(created_at) DESC`).all() as unknown as CommentRow[]
  return rows.map(toAdminComment)
}

export async function setCommentStatus(id: number, status: CommentStatus): Promise<AdminComment | null> {
  ensureCommentSchema().prepare("UPDATE comments SET status = ?, updated_at = ? WHERE id = ?").run(status, new Date().toISOString(), id)
  const row = ensureCommentSchema().prepare(`${select} WHERE id = ?`).get(id) as unknown as CommentRow | undefined
  return row ? toAdminComment(row) : null
}

export function getApprovedCommentEmail(id: number): string | null {
  if (!Number.isSafeInteger(id) || id < 1) return null
  const row = ensureCommentSchema().prepare(
    "SELECT COALESCE(email, '') AS email FROM comments WHERE id = ? AND status = 'approved'",
  ).get(id) as { email?: string } | undefined
  return row?.email?.trim().toLowerCase() || null
}

export async function deleteComment(id: number): Promise<boolean> {
  return Number(ensureCommentSchema().prepare("DELETE FROM comments WHERE id = ?").run(id).changes) > 0
}
