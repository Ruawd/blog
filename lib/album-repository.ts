import type { DatabaseSync } from "node:sqlite"
import { unstable_cache } from "next/cache"

import { getDatabase } from "@/db"
import { albumPhotos as defaultAlbumPhotos } from "@/lib/migrated-content"
import { publicCacheTags } from "@/lib/public-cache"

export type AlbumPhoto = {
  id: number
  albumSlug: string
  src: string
  alt: string
  caption: string
  width: number
  height: number
  takenAt: string
  originalName: string
  sortOrder: number
  updatedAt: string
}

export type AlbumPhotoInput = Pick<
  AlbumPhoto,
  "src" | "alt" | "caption" | "width" | "height" | "takenAt" | "originalName"
>

export type AlbumCollection = {
  id: number
  slug: string
  title: string
  description: string
  period: string
  coverSrc: string
  sortOrder: number
  photoCount: number
  updatedAt: string
  photos: AlbumPhoto[]
}

export type AlbumCollectionSummary = Omit<AlbumCollection, "photos">

export type AlbumCollectionInput = Pick<
  AlbumCollection,
  "slug" | "title" | "description" | "period" | "coverSrc"
> & { photos: AlbumPhotoInput[] }

type AlbumCollectionRow = Omit<AlbumCollection, "photoCount" | "photos">
type AlbumPhotoRow = AlbumPhoto

const defaultCollection: Omit<AlbumCollectionInput, "photos"> = {
  slug: "firefly",
  title: "流萤相册",
  description: "崩坏：星穹铁道中的流萤插画收藏。",
  period: "2026.01.01",
  coverSrc: "/blog-media/gallery/firefly-2026/cover.avif",
}

let schemaReady = false

function tableExists(db: DatabaseSync, name: string): boolean {
  return Boolean(db.prepare(`
    SELECT 1 FROM sqlite_master
    WHERE type = 'table' AND name = ?
    LIMIT 1
  `).get(name))
}

function seedDefaultCollection(db: DatabaseSync): void {
  db.prepare(`
    INSERT INTO album_collections (
      slug, title, description, period, cover_src, sort_order, updated_by
    ) VALUES (?, ?, ?, ?, ?, 0, 'bootstrap')
  `).run(
    defaultCollection.slug,
    defaultCollection.title,
    defaultCollection.description,
    defaultCollection.period,
    defaultCollection.coverSrc,
  )
}

function seedDefaultPhotos(db: DatabaseSync): void {
  const insert = db.prepare(`
    INSERT INTO album_photos (
      album_slug, src, alt, caption, width, height, taken_at, original_name,
      sort_order, updated_by, created_at, updated_at
    ) VALUES ('firefly', ?, ?, ?, ?, ?, '', '', ?, 'bootstrap', ?, ?)
  `)
  const now = new Date().toISOString()
  defaultAlbumPhotos.forEach((photo, index) => {
    insert.run(photo.src, photo.alt, "可爱流萤", photo.width, photo.height, index, now, now)
  })
}

function ensureAlbumSchema(): DatabaseSync {
  const db = getDatabase()
  if (schemaReady) return db

  const collectionsExisted = tableExists(db, "album_collections")
  const photosExisted = tableExists(db, "album_photos")
  db.exec(`
    CREATE TABLE IF NOT EXISTS album_collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      period TEXT NOT NULL DEFAULT '',
      cover_src TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL,
      updated_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS album_collections_slug_unique
      ON album_collections (slug);
    CREATE UNIQUE INDEX IF NOT EXISTS album_collections_sort_order_unique
      ON album_collections (sort_order);
    CREATE TABLE IF NOT EXISTS album_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      album_slug TEXT NOT NULL DEFAULT 'firefly',
      src TEXT NOT NULL,
      alt TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      width INTEGER NOT NULL CHECK (width > 0),
      height INTEGER NOT NULL CHECK (height > 0),
      taken_at TEXT NOT NULL DEFAULT '',
      original_name TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL,
      updated_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const columns = new Set(
    (db.prepare("PRAGMA table_info(album_photos)").all() as unknown as Array<{ name: string }>).map((column) => column.name),
  )
  if (!columns.has("taken_at")) db.exec("ALTER TABLE album_photos ADD COLUMN taken_at TEXT NOT NULL DEFAULT ''")
  if (!columns.has("original_name")) db.exec("ALTER TABLE album_photos ADD COLUMN original_name TEXT NOT NULL DEFAULT ''")
  if (!columns.has("album_slug")) db.exec("ALTER TABLE album_photos ADD COLUMN album_slug TEXT NOT NULL DEFAULT 'firefly'")
  db.exec(`
    DROP INDEX IF EXISTS album_photos_sort_order_unique;
    CREATE UNIQUE INDEX IF NOT EXISTS album_photos_album_order_unique
      ON album_photos (album_slug, sort_order);
    CREATE INDEX IF NOT EXISTS album_photos_album_idx
      ON album_photos (album_slug);
  `)

  db.exec("BEGIN IMMEDIATE")
  try {
    // Bootstrap only while introducing the collection table. If an
    // administrator intentionally saves an empty list, keep it empty after a
    // process restart instead of silently recreating the default album.
    if (!collectionsExisted) seedDefaultCollection(db)
    if (!photosExisted) seedDefaultPhotos(db)
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }

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

function normalizeOptionalSource(value: unknown): string {
  return typeof value === "string" && value.trim() ? normalizeSource(value) : ""
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

function normalizeAlbumPhotos(value: unknown, albumIndex: number): AlbumPhotoInput[] {
  if (!Array.isArray(value)) throw new Error(`第 ${albumIndex + 1} 个相册的图片格式不正确`)
  if (value.length > 250) throw new Error("每个子相册最多保存 250 张图片")

  return value.map((item, photoIndex) => {
    if (!item || typeof item !== "object") throw new Error(`第 ${albumIndex + 1} 个相册的第 ${photoIndex + 1} 张图片格式不正确`)
    const input = item as Record<string, unknown>
    const prefix = `第 ${albumIndex + 1} 个相册的第 ${photoIndex + 1} 张图片`
    return {
      src: normalizeSource(input.src),
      alt: normalizeText(input.alt, `${prefix}替代文字`, 160, true),
      caption: normalizeText(input.caption, `${prefix}图注`, 100),
      width: normalizeDimension(input.width, `${prefix}宽度`),
      height: normalizeDimension(input.height, `${prefix}高度`),
      takenAt: normalizeText(input.takenAt, `${prefix}拍摄时间`, 32),
      originalName: normalizeText(input.originalName, `${prefix}原始文件名`, 240),
    }
  })
}

export function normalizeAlbumCollections(value: unknown): AlbumCollectionInput[] {
  if (!Array.isArray(value)) throw new Error("子相册数据格式不正确")
  if (value.length > 50) throw new Error("最多保存 50 个子相册")

  const albums = value.map((item, albumIndex) => {
    if (!item || typeof item !== "object") throw new Error(`第 ${albumIndex + 1} 个子相册格式不正确`)
    const input = item as Record<string, unknown>
    const slug = normalizeText(input.slug, `第 ${albumIndex + 1} 个子相册链接标识`, 80, true).toLowerCase()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`第 ${albumIndex + 1} 个子相册的链接标识只能使用小写字母、数字和连字符`)
    }
    return {
      slug,
      title: normalizeText(input.title, `第 ${albumIndex + 1} 个子相册标题`, 80, true),
      description: normalizeText(input.description, `第 ${albumIndex + 1} 个子相册说明`, 280),
      period: normalizeText(input.period, `第 ${albumIndex + 1} 个子相册时间`, 80),
      coverSrc: normalizeOptionalSource(input.coverSrc),
      photos: normalizeAlbumPhotos(input.photos, albumIndex),
    }
  })

  const slugs = new Set<string>()
  let totalPhotos = 0
  for (const album of albums) {
    if (slugs.has(album.slug)) throw new Error(`子相册链接标识 ${album.slug} 重复`)
    slugs.add(album.slug)
    totalPhotos += album.photos.length
  }
  if (totalPhotos > 1_000) throw new Error("全部子相册合计最多保存 1000 张图片")
  return albums
}

function listPhotoRows(db: DatabaseSync): AlbumPhotoRow[] {
  return db.prepare(`
    SELECT
      id,
      album_slug AS albumSlug,
      src,
      alt,
      caption,
      width,
      height,
      taken_at AS takenAt,
      original_name AS originalName,
      sort_order AS sortOrder,
      updated_at AS updatedAt
    FROM album_photos
    ORDER BY album_slug ASC, sort_order ASC, id ASC
  `).all() as unknown as AlbumPhotoRow[]
}

export function listAlbumCollections(): AlbumCollection[] {
  const db = ensureAlbumSchema()
  const collections = db.prepare(`
    SELECT
      id,
      slug,
      title,
      description,
      period,
      cover_src AS coverSrc,
      sort_order AS sortOrder,
      updated_at AS updatedAt
    FROM album_collections
    ORDER BY sort_order ASC, id ASC
  `).all() as unknown as AlbumCollectionRow[]
  const grouped = new Map<string, AlbumPhoto[]>()
  for (const photo of listPhotoRows(db)) {
    const photos = grouped.get(photo.albumSlug) || []
    photos.push({ ...photo })
    grouped.set(photo.albumSlug, photos)
  }
  return collections.map((collection) => {
    const photos = grouped.get(collection.slug) || []
    return { ...collection, photoCount: photos.length, photos }
  })
}

export function listAlbumCollectionSummaries(): AlbumCollectionSummary[] {
  const db = ensureAlbumSchema()
  return db.prepare(`
    SELECT
      collections.id,
      collections.slug,
      collections.title,
      collections.description,
      collections.period,
      collections.cover_src AS coverSrc,
      collections.sort_order AS sortOrder,
      COUNT(photos.id) AS photoCount,
      collections.updated_at AS updatedAt
    FROM album_collections AS collections
    LEFT JOIN album_photos AS photos ON photos.album_slug = collections.slug
    GROUP BY collections.id
    ORDER BY collections.sort_order ASC, collections.id ASC
  `).all() as unknown as AlbumCollectionSummary[]
}

export function getAlbumCollection(slug: string): AlbumCollection | null {
  return listAlbumCollections().find((album) => album.slug === slug) || null
}

export function listAlbumPhotos(slug = "firefly"): AlbumPhoto[] {
  return getAlbumCollection(slug)?.photos || []
}

const listCachedAlbumCollectionsInternal = unstable_cache(
  async () => listAlbumCollections(),
  ["public-album-collections-v2"],
  { revalidate: 300, tags: [publicCacheTags.album] },
)

const listCachedAlbumCollectionSummariesInternal = unstable_cache(
  async () => listAlbumCollectionSummaries(),
  ["public-album-collection-summaries-v1"],
  { revalidate: 300, tags: [publicCacheTags.album] },
)

const getCachedAlbumCollectionInternal = unstable_cache(
  async (slug: string) => getAlbumCollection(slug),
  ["public-album-collection-v2"],
  { revalidate: 300, tags: [publicCacheTags.album] },
)

export async function listCachedAlbumCollections(): Promise<AlbumCollection[]> {
  return listCachedAlbumCollectionsInternal()
}

export async function listCachedAlbumCollectionSummaries(): Promise<AlbumCollectionSummary[]> {
  return listCachedAlbumCollectionSummariesInternal()
}

export async function getCachedAlbumCollection(slug: string): Promise<AlbumCollection | null> {
  return getCachedAlbumCollectionInternal(slug)
}

export async function listCachedAlbumPhotos(slug = "firefly"): Promise<AlbumPhoto[]> {
  return (await getCachedAlbumCollection(slug))?.photos || []
}

export function saveAlbumCollections(value: unknown, username: string): AlbumCollection[] {
  const albums = normalizeAlbumCollections(value)
  const db = ensureAlbumSchema()
  const insertAlbum = db.prepare(`
    INSERT INTO album_collections (
      slug, title, description, period, cover_src, sort_order, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertPhoto = db.prepare(`
    INSERT INTO album_photos (
      album_slug, src, alt, caption, width, height, taken_at, original_name,
      sort_order, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const now = new Date().toISOString()

  db.exec("BEGIN IMMEDIATE")
  try {
    db.prepare("DELETE FROM album_photos").run()
    db.prepare("DELETE FROM album_collections").run()
    albums.forEach((album, albumIndex) => {
      insertAlbum.run(
        album.slug,
        album.title,
        album.description,
        album.period,
        album.coverSrc,
        albumIndex,
        username,
        now,
        now,
      )
      album.photos.forEach((photo, photoIndex) => {
        insertPhoto.run(
          album.slug,
          photo.src,
          photo.alt,
          photo.caption,
          photo.width,
          photo.height,
          photo.takenAt,
          photo.originalName,
          photoIndex,
          username,
          now,
          now,
        )
      })
    })
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }

  return listAlbumCollections()
}
