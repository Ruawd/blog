import type { DatabaseSync } from "node:sqlite"

import { getDatabase } from "@/db"
import { albumPhotos as defaultAlbumPhotos } from "@/lib/migrated-content"

export type AlbumPhoto = {
  id: number
  src: string
  alt: string
  caption: string
  width: number
  height: number
  sortOrder: number
  updatedAt: string
}

export type AlbumPhotoInput = Pick<
  AlbumPhoto,
  "src" | "alt" | "caption" | "width" | "height"
>

type AlbumPhotoRow = {
  id: number
  src: string
  alt: string
  caption: string
  width: number
  height: number
  sortOrder: number
  updatedAt: string
}

let schemaReady = false

function tableExists(db: DatabaseSync): boolean {
  return Boolean(db.prepare(`
    SELECT 1 FROM sqlite_master
    WHERE type = 'table' AND name = 'album_photos'
    LIMIT 1
  `).get())
}

function seedDefaultPhotos(db: DatabaseSync): void {
  const insert = db.prepare(`
    INSERT INTO album_photos (
      src, alt, caption, width, height, sort_order, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'bootstrap', ?, ?)
  `)
  const now = new Date().toISOString()
  db.exec("BEGIN IMMEDIATE")
  try {
    defaultAlbumPhotos.forEach((photo, index) => {
      insert.run(photo.src, photo.alt, "可爱流萤", photo.width, photo.height, index, now, now)
    })
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}

function ensureAlbumSchema(): DatabaseSync {
  const db = getDatabase()
  if (schemaReady) return db

  const existed = tableExists(db)
  db.exec(`
    CREATE TABLE IF NOT EXISTS album_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      src TEXT NOT NULL,
      alt TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      width INTEGER NOT NULL CHECK (width > 0),
      height INTEGER NOT NULL CHECK (height > 0),
      sort_order INTEGER NOT NULL,
      updated_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS album_photos_sort_order_unique
      ON album_photos (sort_order);
  `)
  if (!existed) seedDefaultPhotos(db)
  schemaReady = true
  return db
}

function normalizeSource(value: unknown): string {
  const source = typeof value === "string" ? value.trim() : ""
  if (!source || source.length > 2_048 || /[\u0000-\u001f\\]/.test(source)) {
    throw new Error("图片地址格式不正确")
  }

  if (source.startsWith("/")) {
    if (source.startsWith("//") || /(^|\/)\.\.?($|[/?#])/.test(source)) {
      throw new Error("站内图片地址格式不正确")
    }
    return source
  }

  let url: URL
  try {
    url = new URL(source)
  } catch {
    throw new Error("图片地址格式不正确")
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("外部图片必须使用不含凭据的 HTTPS 地址")
  }
  return url.toString()
}

function normalizeText(value: unknown, label: string, maxLength: number, required = false): string {
  const text = typeof value === "string" ? value.trim() : ""
  if (required && !text) throw new Error(`${label}不能为空`)
  if (text.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字符`)
  return text
}

function normalizeDimension(value: unknown, label: string): number {
  const dimension = Number(value)
  if (!Number.isInteger(dimension) || dimension < 1 || dimension > 20_000) {
    throw new Error(`${label}需填写 1 到 20000 之间的整数`)
  }
  return dimension
}

export function normalizeAlbumPhotos(value: unknown): AlbumPhotoInput[] {
  if (!Array.isArray(value)) throw new Error("相册图片格式不正确")
  if (value.length > 250) throw new Error("相册最多保存 250 张图片")

  return value.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`第 ${index + 1} 张图片格式不正确`)
    const input = item as Record<string, unknown>
    return {
      src: normalizeSource(input.src),
      alt: normalizeText(input.alt, `第 ${index + 1} 张图片的替代文字`, 160, true),
      caption: normalizeText(input.caption, `第 ${index + 1} 张图片的图注`, 100),
      width: normalizeDimension(input.width, `第 ${index + 1} 张图片的宽度`),
      height: normalizeDimension(input.height, `第 ${index + 1} 张图片的高度`),
    }
  })
}

export function listAlbumPhotos(): AlbumPhoto[] {
  const rows = ensureAlbumSchema().prepare(`
    SELECT
      id,
      src,
      alt,
      caption,
      width,
      height,
      sort_order AS sortOrder,
      updated_at AS updatedAt
    FROM album_photos
    ORDER BY sort_order ASC, id ASC
  `).all() as unknown as AlbumPhotoRow[]
  return rows.map((row) => ({ ...row }))
}

export function saveAlbumPhotos(value: unknown, username: string): AlbumPhoto[] {
  const photos = normalizeAlbumPhotos(value)
  const db = ensureAlbumSchema()
  const insert = db.prepare(`
    INSERT INTO album_photos (
      src, alt, caption, width, height, sort_order, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const now = new Date().toISOString()

  db.exec("BEGIN IMMEDIATE")
  try {
    db.prepare("DELETE FROM album_photos").run()
    photos.forEach((photo, index) => {
      insert.run(
        photo.src,
        photo.alt,
        photo.caption,
        photo.width,
        photo.height,
        index,
        username,
        now,
        now,
      )
    })
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }

  return listAlbumPhotos()
}
