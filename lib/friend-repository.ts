import { createHmac } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"

import { getDatabase } from "@/db"
import type { FriendReviewResult } from "@/lib/friend-review"
import { friends as defaultFriends } from "@/lib/migrated-content"
import { normalizePublicHttpsUrl } from "@/lib/safe-remote-resource"

export type FriendStatus = "pending" | "approved" | "rejected" | "hidden"

export type FriendLink = {
  id: number
  name: string
  url: string
  avatarUrl: string
  description: string
  backlinkUrl: string
  status: FriendStatus
  sortOrder: number
  reviewMessage: string
  lastCheckedAt: string | null
  createdAt: string
  updatedAt: string
}

export type PublicFriendLink = Pick<
  FriendLink,
  "id" | "name" | "url" | "avatarUrl" | "description"
>

export type FriendInput = Pick<
  FriendLink,
  "name" | "url" | "avatarUrl" | "description" | "backlinkUrl" | "status"
>

export type FriendApplicationInput = Omit<FriendInput, "status"> & { company: string }

type FriendRow = {
  id: number
  name: string
  url: string
  avatarUrl: string
  description: string
  backlinkUrl: string
  status: FriendStatus
  sortOrder: number
  reviewMessage: string
  lastCheckedAt: string | null
  createdAt: string
  updatedAt: string
}

const statuses = new Set<FriendStatus>(["pending", "approved", "rejected", "hidden"])
let schemaReady = false

function tableExists(db: DatabaseSync): boolean {
  return Boolean(db.prepare(`
    SELECT 1 FROM sqlite_master
    WHERE type = 'table' AND name = 'friend_links'
    LIMIT 1
  `).get())
}

function seedDefaultFriends(db: DatabaseSync): void {
  const insert = db.prepare(`
    INSERT INTO friend_links (
      name, url, avatar_url, description, backlink_url, status, sort_order,
      review_message, last_checked_at, submitted_ip_hash, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, '', 'approved', ?, '迁移友链，已保留', NULL, '', 'bootstrap', ?, ?)
  `)
  const now = new Date().toISOString()
  db.exec("BEGIN IMMEDIATE")
  try {
    defaultFriends.forEach((friend, index) => {
      insert.run(
        friend.name,
        normalizePublicHttpsUrl(friend.url, "默认友链地址"),
        normalizePublicHttpsUrl(friend.image, "默认友链头像", true),
        friend.description,
        index,
        now,
        now,
      )
    })
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}

function ensureFriendSchema(): DatabaseSync {
  const db = getDatabase()
  if (schemaReady) return db

  const existed = tableExists(db)
  db.exec(`
    CREATE TABLE IF NOT EXISTS friend_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      avatar_url TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      backlink_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      sort_order INTEGER NOT NULL,
      review_message TEXT NOT NULL DEFAULT '',
      last_checked_at TEXT,
      submitted_ip_hash TEXT NOT NULL DEFAULT '',
      updated_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS friend_links_url_unique ON friend_links (url);
    CREATE INDEX IF NOT EXISTS friend_links_status_order_idx ON friend_links (status, sort_order);
  `)
  if (!existed) seedDefaultFriends(db)
  schemaReady = true
  return db
}

const select = `SELECT
  id,
  name,
  url,
  avatar_url AS avatarUrl,
  description,
  backlink_url AS backlinkUrl,
  status,
  sort_order AS sortOrder,
  review_message AS reviewMessage,
  last_checked_at AS lastCheckedAt,
  created_at AS createdAt,
  updated_at AS updatedAt
FROM friend_links`

function toFriend(row: FriendRow): FriendLink {
  return { ...row }
}

function normalizeText(value: unknown, label: string, options: { min?: number; max: number }): string {
  const text = typeof value === "string" ? value.trim() : ""
  const min = options.min ?? 0
  if (text.length < min || text.length > options.max) {
    throw new Error(`${label}需要 ${min || 0}–${options.max} 个字符`)
  }
  return text
}

function normalizeStatus(value: unknown): FriendStatus {
  if (typeof value === "string" && statuses.has(value as FriendStatus)) return value as FriendStatus
  throw new Error("友链状态不正确")
}

export function normalizeFriendInput(value: unknown): FriendInput {
  if (!value || typeof value !== "object") throw new Error("友链格式不正确")
  const input = value as Record<string, unknown>
  return {
    name: normalizeText(input.name, "站点名称", { min: 1, max: 60 }),
    url: normalizePublicHttpsUrl(input.url, "站点地址"),
    avatarUrl: normalizePublicHttpsUrl(input.avatarUrl, "头像地址", true),
    description: normalizeText(input.description, "站点介绍", { max: 240 }),
    backlinkUrl: normalizePublicHttpsUrl(input.backlinkUrl, "友链页面", true),
    status: normalizeStatus(input.status),
  }
}

export function normalizeFriendApplication(value: unknown): FriendApplicationInput {
  if (!value || typeof value !== "object") throw new Error("友链申请格式不正确")
  const input = value as Record<string, unknown>
  const company = typeof input.company === "string" ? input.company.trim() : ""
  if (company) throw new Error("友链申请校验失败")
  return {
    name: normalizeText(input.name, "站点名称", { min: 1, max: 60 }),
    url: normalizePublicHttpsUrl(input.url, "站点地址"),
    avatarUrl: normalizePublicHttpsUrl(input.avatarUrl, "头像地址", true),
    description: normalizeText(input.description, "站点介绍", { max: 240 }),
    backlinkUrl: normalizePublicHttpsUrl(input.backlinkUrl, "友链页面"),
    company,
  }
}

function nextSortOrder(db: DatabaseSync): number {
  const row = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS value FROM friend_links").get() as { value: number }
  return Number(row.value)
}

function findByUrl(url: string): FriendLink | null {
  const row = ensureFriendSchema().prepare(`${select} WHERE url = ? LIMIT 1`).get(url) as unknown as FriendRow | undefined
  return row ? toFriend(row) : null
}

export function getFriendLink(id: number): FriendLink | null {
  if (!Number.isSafeInteger(id) || id < 1) return null
  const row = ensureFriendSchema().prepare(`${select} WHERE id = ? LIMIT 1`).get(id) as unknown as FriendRow | undefined
  return row ? toFriend(row) : null
}

export function listPublicFriendLinks(): PublicFriendLink[] {
  const rows = ensureFriendSchema().prepare(`
    ${select} WHERE status = 'approved' ORDER BY sort_order ASC, id ASC
  `).all() as unknown as FriendRow[]
  return rows.map((row) => {
    const friend = toFriend(row)
    return {
      id: friend.id,
      name: friend.name,
      url: friend.url,
      avatarUrl: friend.avatarUrl,
      description: friend.description,
    }
  })
}

export function listAdminFriendLinks(): FriendLink[] {
  const rows = ensureFriendSchema().prepare(`
    ${select} ORDER BY sort_order ASC, id ASC
  `).all() as unknown as FriendRow[]
  return rows.map(toFriend)
}

export function createAdminFriendLink(value: unknown, username: string): FriendLink {
  const input = normalizeFriendInput(value)
  if (findByUrl(input.url)) throw new Error("这个站点地址已经存在")
  const db = ensureFriendSchema()
  const now = new Date().toISOString()
  const result = db.prepare(`
    INSERT INTO friend_links (
      name, url, avatar_url, description, backlink_url, status, sort_order,
      review_message, last_checked_at, submitted_ip_hash, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, '管理员创建', NULL, '', ?, ?, ?)
  `).run(
    input.name,
    input.url,
    input.avatarUrl,
    input.description,
    input.backlinkUrl,
    input.status,
    nextSortOrder(db),
    username,
    now,
    now,
  )
  return getFriendLink(Number(result.lastInsertRowid)) as FriendLink
}

export function updateAdminFriendLink(id: number, value: unknown, username: string): FriendLink | null {
  const current = getFriendLink(id)
  if (!current) return null
  const input = normalizeFriendInput(value)
  const duplicate = findByUrl(input.url)
  if (duplicate && duplicate.id !== id) throw new Error("这个站点地址已经存在")
  ensureFriendSchema().prepare(`
    UPDATE friend_links SET
      name = ?, url = ?, avatar_url = ?, description = ?, backlink_url = ?, status = ?,
      updated_by = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.name,
    input.url,
    input.avatarUrl,
    input.description,
    input.backlinkUrl,
    input.status,
    username,
    new Date().toISOString(),
    id,
  )
  return getFriendLink(id)
}

export function saveFriendApplication(
  value: FriendApplicationInput,
  address: string,
  result: FriendReviewResult,
): FriendLink {
  const db = ensureFriendSchema()
  const current = findByUrl(value.url)
  if (current?.status === "approved") throw new Error("这个站点已经在友链列表中")
  if (current?.status === "hidden") throw new Error("这个站点暂时不能重新提交申请")
  const status: FriendStatus = result.approved ? "approved" : "pending"
  const now = new Date().toISOString()
  const secret = process.env.SESSION_SECRET || "local-friend-application-hash"
  const ipHash = createHmac("sha256", secret).update(address).digest("hex")

  if (current) {
    db.prepare(`
      UPDATE friend_links SET
        name = ?, avatar_url = ?, description = ?, backlink_url = ?, status = ?,
        review_message = ?, last_checked_at = ?, submitted_ip_hash = ?,
        updated_by = 'auto-review', updated_at = ?
      WHERE id = ?
    `).run(
      value.name,
      value.avatarUrl,
      value.description,
      value.backlinkUrl,
      status,
      result.message,
      result.checkedAt,
      ipHash,
      now,
      current.id,
    )
    return getFriendLink(current.id) as FriendLink
  }

  const insert = db.prepare(`
    INSERT INTO friend_links (
      name, url, avatar_url, description, backlink_url, status, sort_order,
      review_message, last_checked_at, submitted_ip_hash, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'auto-review', ?, ?)
  `).run(
    value.name,
    value.url,
    value.avatarUrl,
    value.description,
    value.backlinkUrl,
    status,
    nextSortOrder(db),
    result.message,
    result.checkedAt,
    ipHash,
    now,
    now,
  )
  return getFriendLink(Number(insert.lastInsertRowid)) as FriendLink
}

export function applyFriendReview(id: number, result: FriendReviewResult, username: string): FriendLink | null {
  const status: FriendStatus = result.approved ? "approved" : "pending"
  const updated = ensureFriendSchema().prepare(`
    UPDATE friend_links SET status = ?, review_message = ?, last_checked_at = ?, updated_by = ?, updated_at = ?
    WHERE id = ?
  `).run(status, result.message, result.checkedAt, username, new Date().toISOString(), id)
  return Number(updated.changes) ? getFriendLink(id) : null
}

export function moveFriendLink(id: number, direction: "up" | "down"): FriendLink[] {
  const db = ensureFriendSchema()
  const current = getFriendLink(id)
  if (!current) throw new Error("没有找到这条友链")
  const comparator = direction === "up" ? "<" : ">"
  const order = direction === "up" ? "DESC" : "ASC"
  const target = db.prepare(`
    ${select} WHERE sort_order ${comparator} ? ORDER BY sort_order ${order}, id ${order} LIMIT 1
  `).get(current.sortOrder) as unknown as FriendRow | undefined
  if (!target) return listAdminFriendLinks()

  db.exec("BEGIN IMMEDIATE")
  try {
    db.prepare("UPDATE friend_links SET sort_order = ?, updated_at = ? WHERE id = ?")
      .run(target.sortOrder, new Date().toISOString(), current.id)
    db.prepare("UPDATE friend_links SET sort_order = ?, updated_at = ? WHERE id = ?")
      .run(current.sortOrder, new Date().toISOString(), target.id)
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
  return listAdminFriendLinks()
}

export function deleteFriendLink(id: number): boolean {
  return Number(ensureFriendSchema().prepare("DELETE FROM friend_links WHERE id = ?").run(id).changes) > 0
}
