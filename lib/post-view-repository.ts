import type { DatabaseSync } from "node:sqlite"

import { getDatabase } from "@/db"

export type PostViewResult = {
  count: number
  counted: boolean
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const chinaOffsetMs = 8 * 60 * 60_000
let schemaReady = false
let recordedViews = 0

function viewedDay(date: Date): string {
  return new Date(date.getTime() + chinaOffsetMs).toISOString().slice(0, 10)
}

function ensurePostViewSchema(): DatabaseSync {
  const db = getDatabase()
  if (schemaReady) return db
  db.exec(`
    CREATE TABLE IF NOT EXISTS post_views (
      slug TEXT PRIMARY KEY NOT NULL,
      view_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS post_view_events (
      slug TEXT NOT NULL,
      actor_hash TEXT NOT NULL,
      viewed_day TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (slug, actor_hash, viewed_day)
    );
    CREATE INDEX IF NOT EXISTS post_view_events_day_idx
      ON post_view_events (viewed_day);
  `)
  schemaReady = true
  return db
}

function normalizeSlug(value: string): string {
  const slug = value.trim().toLowerCase()
  if (!slugPattern.test(slug) || slug.length > 180) throw new Error("文章链接标识不正确")
  return slug
}

function normalizeActorHash(value: string): string {
  const hash = value.trim().toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error("浏览者标识不正确")
  return hash
}

export function getPostViewCount(slugValue: string): number {
  const slug = normalizeSlug(slugValue)
  const row = ensurePostViewSchema().prepare(`
    SELECT view_count AS viewCount FROM post_views WHERE slug = ? LIMIT 1
  `).get(slug) as { viewCount: number } | undefined
  return Number(row?.viewCount || 0)
}

export function listPostViewCounts(slugValues: readonly string[]): Record<string, number> {
  const slugs = [...new Set(slugValues.map((slug) => normalizeSlug(slug)))].slice(0, 500)
  const result = Object.fromEntries(slugs.map((slug) => [slug, 0])) as Record<string, number>
  if (!slugs.length) return result

  const placeholders = slugs.map(() => "?").join(", ")
  const rows = ensurePostViewSchema().prepare(`
    SELECT slug, view_count AS viewCount
    FROM post_views
    WHERE slug IN (${placeholders})
  `).all(...slugs) as unknown as Array<{ slug: string; viewCount: number }>
  for (const row of rows) result[row.slug] = Number(row.viewCount || 0)
  return result
}

export function recordPostView(slugValue: string, actorHashValue: string, now = new Date()): PostViewResult {
  const slug = normalizeSlug(slugValue)
  const actorHash = normalizeActorHash(actorHashValue)
  const currentViewedDay = viewedDay(now)
  const updatedAt = now.toISOString()
  const db = ensurePostViewSchema()
  let counted = false

  db.exec("BEGIN IMMEDIATE")
  try {
    const event = db.prepare(`
      INSERT OR IGNORE INTO post_view_events (slug, actor_hash, viewed_day, created_at)
      VALUES (?, ?, ?, ?)
    `).run(slug, actorHash, currentViewedDay, updatedAt)
    counted = event.changes > 0

    if (counted) {
      db.prepare(`
        INSERT INTO post_views (slug, view_count, updated_at)
        VALUES (?, 1, ?)
        ON CONFLICT(slug) DO UPDATE SET
          view_count = post_views.view_count + 1,
          updated_at = excluded.updated_at
      `).run(slug, updatedAt)
    }
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }

  recordedViews += 1
  if (recordedViews % 250 === 0) {
    const cutoff = viewedDay(new Date(now.getTime() - 120 * 24 * 60 * 60_000))
    db.prepare("DELETE FROM post_view_events WHERE viewed_day < ?").run(cutoff)
  }

  return { count: getPostViewCount(slug), counted }
}
