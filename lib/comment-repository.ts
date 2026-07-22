import { createHmac } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"

import { getDatabase } from "@/db"
import {
  commentReactionOptions,
  isCommentInteractionKind,
  type CommentInteractionKind,
  type CommentReactionKind,
} from "@/lib/comment-reactions"

export type CommentScope = "guestbook" | "article"
export type CommentStatus = "approved" | "hidden"
export type CommentReactionSummary = {
  kind: CommentReactionKind
  count: number
  active: boolean
}
export type PublicComment = {
  id: number
  scope: CommentScope
  target: string
  parentId: number | null
  replyToNickname: string
  nickname: string
  website: string
  avatarUrl: string
  content: string
  likes: { count: number; active: boolean }
  reactions: CommentReactionSummary[]
  createdAt: string
}
export type AdminComment = PublicComment & { email: string; status: CommentStatus }
export type CommentInteractionUpdate = {
  kind: CommentInteractionKind
  count: number
  active: boolean
}
export type PublicCommentPage = {
  comments: PublicComment[]
  pagination: {
    totalComments: number
    totalThreads: number
    nextCursor: number | null
  }
}
export type CommentNotificationContext = {
  id: number
  scope: CommentScope
  target: string
  parentId: number | null
  nickname: string
  email: string
  content: string
}

type CommentRow = {
  id: number
  scope: CommentScope
  target: string
  parentId: number | null
  replyToNickname: string
  nickname: string
  email: string
  website: string
  avatarUrl: string
  content: string
  status: CommentStatus
  createdAt: string
}

type InteractionSummary = {
  likes: { count: number; active: boolean }
  reactions: CommentReactionSummary[]
}

const MAX_REPLY_DEPTH = 8
let schemaReady = false

function ensureCommentSchema(): DatabaseSync {
  const db = getDatabase()
  if (schemaReady) return db

  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT NOT NULL,
      target TEXT NOT NULL,
      nickname TEXT NOT NULL,
      email TEXT,
      website TEXT,
      avatar_url TEXT,
      parent_id INTEGER REFERENCES comments(id) ON DELETE SET NULL,
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
  if (!columns.some((column) => column.name === "parent_id")) {
    db.exec("ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id) ON DELETE SET NULL")
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS comments_parent_status_idx
    ON comments (parent_id, status, created_at);
    CREATE TABLE IF NOT EXISTS comment_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      actor_hash TEXT NOT NULL,
      kind TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS comment_interactions_actor_kind_unique
    ON comment_interactions (comment_id, actor_hash, kind);
    CREATE INDEX IF NOT EXISTS comment_interactions_comment_kind_idx
    ON comment_interactions (comment_id, kind);
  `)
  schemaReady = true
  return db
}

const select = `SELECT
  c.id,
  c.scope,
  c.target,
  c.parent_id AS parentId,
  COALESCE(parent.nickname, '') AS replyToNickname,
  c.nickname,
  COALESCE(c.email, '') AS email,
  COALESCE(c.website, '') AS website,
  COALESCE(c.avatar_url, '') AS avatarUrl,
  c.content,
  c.status,
  c.created_at AS createdAt
FROM comments c
LEFT JOIN comments parent ON parent.id = c.parent_id`

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
    if (url.protocol !== "https:" || url.username || url.password) throw new Error()
    url.hash = ""
    return url.toString()
  } catch {
    throw new Error("头像链接必须是有效的 HTTPS 地址")
  }
}

function optionalParentId(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null
  const parentId = Number(value)
  if (!Number.isSafeInteger(parentId) || parentId < 1) throw new Error("回复目标不正确")
  return parentId
}

function publicAvatarUrl(row: CommentRow): string {
  if (row.avatarUrl) return row.avatarUrl
  return row.email ? `/api/avatars/comments/${row.id}?v=2` : ""
}

function emptyInteractionSummary(): InteractionSummary {
  return {
    likes: { count: 0, active: false },
    reactions: commentReactionOptions.map((option) => ({
      kind: option.kind,
      count: 0,
      active: false,
    })),
  }
}

function interactionSummaries(db: DatabaseSync, commentIds: number[], actorHash = ""): Map<number, InteractionSummary> {
  const summaries = new Map(commentIds.map((id) => [id, emptyInteractionSummary()]))
  if (!commentIds.length) return summaries
  const idList = commentIds.join(",")
  const counts = db.prepare(`
    SELECT comment_id AS commentId, kind, COUNT(*) AS count
    FROM comment_interactions
    WHERE comment_id IN (${idList})
    GROUP BY comment_id, kind
  `).all() as unknown as Array<{ commentId: number; kind: string; count: number }>
  for (const row of counts) {
    const summary = summaries.get(row.commentId)
    if (!summary) continue
    if (row.kind === "like") summary.likes.count = Number(row.count)
    else {
      const reaction = summary.reactions.find((item) => item.kind === row.kind)
      if (reaction) reaction.count = Number(row.count)
    }
  }

  if (actorHash) {
    const active = db.prepare(`
      SELECT comment_id AS commentId, kind
      FROM comment_interactions
      WHERE actor_hash = ? AND comment_id IN (${idList})
    `).all(actorHash) as unknown as Array<{ commentId: number; kind: string }>
    for (const row of active) {
      const summary = summaries.get(row.commentId)
      if (!summary) continue
      if (row.kind === "like") summary.likes.active = true
      else {
        const reaction = summary.reactions.find((item) => item.kind === row.kind)
        if (reaction) reaction.active = true
      }
    }
  }
  return summaries
}

function toPublicComment(row: CommentRow, interaction: InteractionSummary): PublicComment {
  return {
    id: row.id,
    scope: row.scope,
    target: row.target,
    parentId: row.parentId,
    replyToNickname: row.replyToNickname,
    nickname: row.nickname,
    website: row.website,
    avatarUrl: publicAvatarUrl(row),
    content: row.content,
    likes: interaction.likes,
    reactions: interaction.reactions,
    createdAt: row.createdAt,
  }
}

function toAdminComment(row: CommentRow, interaction: InteractionSummary): AdminComment {
  return {
    ...toPublicComment(row, interaction),
    email: row.email,
    status: row.status,
  }
}

function visibleApprovedRows(rows: CommentRow[]): CommentRow[] {
  const byId = new Map(rows.map((row) => [row.id, row]))
  return rows.filter((row) => {
    if (row.status !== "approved") return false
    const visited = new Set<number>([row.id])
    let current = row
    while (current.parentId) {
      if (visited.has(current.parentId)) return false
      visited.add(current.parentId)
      const parent = byId.get(current.parentId)
      if (!parent || parent.status !== "approved") return false
      current = parent
    }
    return true
  })
}

function commentRow(id: number): CommentRow | null {
  const row = ensureCommentSchema().prepare(`${select} WHERE c.id = ? LIMIT 1`).get(id) as unknown as CommentRow | undefined
  return row || null
}

function validateParentThread(db: DatabaseSync, parentId: number | null, scope: CommentScope, target: string): void {
  if (!parentId) return
  const visited = new Set<number>()
  let currentId: number | null = parentId
  let depth = 0
  while (currentId) {
    if (visited.has(currentId)) throw new Error("回复关系出现循环")
    visited.add(currentId)
    const parent = db.prepare(`
      SELECT id, scope, target, status, parent_id AS parentId
      FROM comments WHERE id = ? LIMIT 1
    `).get(currentId) as { id: number; scope: CommentScope; target: string; status: CommentStatus; parentId: number | null } | undefined
    if (!parent || parent.scope !== scope || parent.target !== target || parent.status !== "approved") {
      throw new Error("回复的评论不存在或暂不可见")
    }
    depth += 1
    if (depth > MAX_REPLY_DEPTH) throw new Error(`回复最多支持 ${MAX_REPLY_DEPTH} 层`)
    currentId = parent.parentId
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
  const linkCount = (content.match(/(?:https?:\/\/|www\.)/gi) || []).length
  if (linkCount > 4) throw new Error("单条内容最多包含 4 个链接")
  if ((content.match(/\n/g) || []).length > 60) throw new Error("内容换行过多")
  if (/(.)\1{39,}/u.test(content)) throw new Error("内容包含过多重复字符")
  return {
    scope,
    target,
    parentId: optionalParentId(input.parentId),
    nickname,
    email,
    website: optionalUrl(input.website),
    avatarUrl: optionalAvatarUrl(input.avatarUrl),
    content,
  }
}

export async function listPublicComments(scopeValue: unknown, targetValue: unknown, actorHash = ""): Promise<PublicComment[]> {
  const scope = validateScope(scopeValue)
  const target = validateTarget(scope, targetValue)
  const db = ensureCommentSchema()
  const rows = db.prepare(`
    ${select}
    WHERE c.scope = ? AND c.target = ?
    ORDER BY datetime(c.created_at) ASC, c.id ASC
  `).all(scope, target) as unknown as CommentRow[]
  const visible = visibleApprovedRows(rows)
  const interactions = interactionSummaries(db, visible.map((row) => row.id), actorHash)
  return visible.map((row) => toPublicComment(row, interactions.get(row.id) || emptyInteractionSummary()))
}

export async function listPublicCommentPage(
  scopeValue: unknown,
  targetValue: unknown,
  actorHash = "",
  options: { limit?: number; before?: unknown; focus?: unknown } = {},
): Promise<PublicCommentPage> {
  const scope = validateScope(scopeValue)
  const target = validateTarget(scope, targetValue)
  const limit = Math.min(50, Math.max(1, Number.isFinite(options.limit) ? Math.floor(Number(options.limit)) : 12))
  const beforeValue = Number(options.before)
  const before = Number.isSafeInteger(beforeValue) && beforeValue > 0 ? beforeValue : null
  const focusValue = Number(options.focus)
  const focus = Number.isSafeInteger(focusValue) && focusValue > 0 ? focusValue : null
  const db = ensureCommentSchema()
  const rows = db.prepare(`
    ${select}
    WHERE c.scope = ? AND c.target = ?
    ORDER BY datetime(c.created_at) ASC, c.id ASC
  `).all(scope, target) as unknown as CommentRow[]
  const visible = visibleApprovedRows(rows)
  const roots = visible
    .filter((row) => row.parentId === null)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.id - left.id)
  const eligibleRoots = before ? roots.filter((row) => row.id < before) : roots
  const byId = new Map(visible.map((row) => [row.id, row]))
  const rootMemo = new Map<number, number | null>()

  function rootId(row: CommentRow): number | null {
    if (rootMemo.has(row.id)) return rootMemo.get(row.id) ?? null
    const visited = new Set<number>()
    let current: CommentRow | undefined = row
    while (current?.parentId) {
      if (visited.has(current.id)) return null
      visited.add(current.id)
      current = byId.get(current.parentId)
    }
    const id = current?.id ?? null
    rootMemo.set(row.id, id)
    return id
  }

  const focusedRow = !before && focus ? byId.get(focus) : undefined
  const focusedRootId = focusedRow ? rootId(focusedRow) : null
  const focusedRoot = focusedRootId ? roots.find((row) => row.id === focusedRootId) : null
  const selectedRoots = focusedRoot
    ? [focusedRoot, ...eligibleRoots.filter((row) => row.id !== focusedRoot.id)].slice(0, limit)
    : eligibleRoots.slice(0, limit)
  const selectedRootIds = new Set(selectedRoots.map((row) => row.id))

  const selectedRows = visible.filter((row) => {
    const root = rootId(row)
    return root !== null && selectedRootIds.has(root)
  })
  const interactions = interactionSummaries(db, selectedRows.map((row) => row.id), actorHash)
  const hasMore = eligibleRoots.some((row) => !selectedRootIds.has(row.id))

  return {
    comments: selectedRows.map((row) => toPublicComment(row, interactions.get(row.id) || emptyInteractionSummary())),
    pagination: {
      totalComments: visible.length,
      totalThreads: roots.length,
      nextCursor: hasMore ? selectedRoots.at(-1)?.id ?? null : null,
    },
  }
}

export async function createComment(value: unknown, ipAddress: string): Promise<PublicComment> {
  const input = normalizeComment(value)
  const db = ensureCommentSchema()
  validateParentThread(db, input.parentId, input.scope, input.target)
  const now = new Date().toISOString()
  const secret = process.env.SESSION_SECRET || "local-comment-hash"
  const ipHash = createHmac("sha256", secret).update(ipAddress).digest("hex")
  const duplicateSince = new Date(Date.now() - 10 * 60_000).toISOString()
  const duplicate = db.prepare(`
    SELECT id FROM comments
    WHERE scope = ? AND target = ? AND ip_hash = ? AND content = ? AND created_at >= ?
    LIMIT 1
  `).get(input.scope, input.target, ipHash, input.content, duplicateSince)
  if (duplicate) throw new Error("请勿重复提交相同内容")
  const result = db.prepare(`
    INSERT INTO comments (
      scope, target, parent_id, nickname, email, website, avatar_url, content,
      status, ip_hash, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?)
  `).run(
    input.scope,
    input.target,
    input.parentId,
    input.nickname,
    input.email || null,
    input.website || null,
    input.avatarUrl || null,
    input.content,
    ipHash,
    now,
    now,
  )
  const row = commentRow(Number(result.lastInsertRowid))
  if (!row) throw new Error("留言保存失败")
  return toPublicComment(row, emptyInteractionSummary())
}

export async function listAdminComments(): Promise<AdminComment[]> {
  const db = ensureCommentSchema()
  const rows = db.prepare(`${select} ORDER BY datetime(c.created_at) DESC, c.id DESC`).all() as unknown as CommentRow[]
  const interactions = interactionSummaries(db, rows.map((row) => row.id))
  return rows.map((row) => toAdminComment(row, interactions.get(row.id) || emptyInteractionSummary()))
}

export async function setCommentStatus(id: number, status: CommentStatus): Promise<AdminComment | null> {
  const db = ensureCommentSchema()
  db.prepare("UPDATE comments SET status = ?, updated_at = ? WHERE id = ?").run(status, new Date().toISOString(), id)
  const row = commentRow(id)
  if (!row) return null
  const interaction = interactionSummaries(db, [id]).get(id) || emptyInteractionSummary()
  return toAdminComment(row, interaction)
}

export function toggleCommentInteraction(id: number, kindValue: unknown, actorHash: string): CommentInteractionUpdate {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("评论编号不正确")
  if (!isCommentInteractionKind(kindValue)) throw new Error("回应类型不正确")
  if (!actorHash) throw new Error("无法识别当前访客")
  const db = ensureCommentSchema()
  const current = commentRow(id)
  if (!current || current.status !== "approved") throw new Error("评论不存在或暂不可见")
  validateParentThread(db, current.parentId, current.scope, current.target)

  const existing = db.prepare(`
    SELECT id FROM comment_interactions
    WHERE comment_id = ? AND actor_hash = ? AND kind = ? LIMIT 1
  `).get(id, actorHash, kindValue) as { id: number } | undefined
  let active: boolean
  if (existing) {
    db.prepare("DELETE FROM comment_interactions WHERE id = ?").run(existing.id)
    active = false
  } else {
    db.prepare(`
      INSERT INTO comment_interactions (comment_id, actor_hash, kind, created_at)
      VALUES (?, ?, ?, ?)
    `).run(id, actorHash, kindValue, new Date().toISOString())
    active = true
  }
  const count = db.prepare(`
    SELECT COUNT(*) AS count FROM comment_interactions
    WHERE comment_id = ? AND kind = ?
  `).get(id, kindValue) as { count: number }
  return { kind: kindValue, count: Number(count.count), active }
}

export function getApprovedCommentEmail(id: number): string | null {
  if (!Number.isSafeInteger(id) || id < 1) return null
  const db = ensureCommentSchema()
  const row = commentRow(id)
  if (!row || row.status !== "approved") return null
  try {
    validateParentThread(db, row.parentId, row.scope, row.target)
  } catch {
    return null
  }
  return row.email.trim().toLowerCase() || null
}

export function getCommentNotificationContext(id: number): CommentNotificationContext | null {
  if (!Number.isSafeInteger(id) || id < 1) return null
  const row = commentRow(id)
  if (!row || row.status !== "approved") return null
  return {
    id: row.id,
    scope: row.scope,
    target: row.target,
    parentId: row.parentId,
    nickname: row.nickname,
    email: row.email.trim().toLowerCase(),
    content: row.content,
  }
}

export async function deleteComment(id: number): Promise<boolean> {
  return Number(ensureCommentSchema().prepare("DELETE FROM comments WHERE id = ?").run(id).changes) > 0
}
