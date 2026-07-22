import { createHash } from "node:crypto"

import {
  bangumiCategoryDefinitions,
  type BangumiCategory,
  type BangumiSettings,
} from "@/lib/bangumi-settings"

export type BangumiImages = {
  small?: string
  grid?: string
  large?: string
  medium?: string
  common?: string
}

export type BangumiCollectionItem = {
  updated_at: string
  comment: string | null
  tags: string[]
  subject: {
    date: string | null
    images: BangumiImages | null
    name: string
    name_cn: string
    short_summary: string
    tags: Array<{ name: string; count: number }>
    score: number
    type: number
    id: number
    eps: number
    volumes: number
    collection_total: number
    rank: number
  }
  subject_id: number
  vol_status: number
  ep_status: number
  subject_type: number
  type: 1 | 2 | 3 | 4 | 5
  rate: number
  private: boolean
}

export type BangumiLibrarySection = {
  id: BangumiCategory
  label: string
  count: number
  items: BangumiCollectionItem[]
}

export type BangumiLibrary = {
  userId: string
  profileUrl: string
  subjectBaseUrl: string
  sections: BangumiLibrarySection[]
  total: number
  fetchedAt: string
}

type PagedCollections = {
  data?: BangumiCollectionItem[]
  total?: number
  limit?: number
  offset?: number
}

type CacheEntry = { expiresAt: number; value: BangumiLibrary }
const libraryCache = new Map<string, CacheEntry>()

function cacheKey(settings: BangumiSettings): string {
  return createHash("sha256").update(JSON.stringify({
    userId: settings.userId,
    apiBaseUrl: settings.apiBaseUrl,
    subjectBaseUrl: settings.subjectBaseUrl,
    enabledCategories: settings.enabledCategories,
    includePrivate: settings.includePrivate,
    accessToken: settings.accessToken,
  })).digest("hex")
}

function errorMessage(status: number, body: string): string {
  if (status === 401 || status === 403) return "Bangumi 拒绝了访问，请检查访问令牌"
  if (status === 404) return "没有找到这个 Bangumi 用户"
  if (status === 429) return "Bangumi 请求过于频繁，请稍后再试"
  const detail = body.replace(/\s+/g, " ").trim().slice(0, 160)
  return detail ? `Bangumi API 返回 ${status}：${detail}` : `Bangumi API 返回 ${status}`
}

async function fetchCategory(settings: BangumiSettings, category: BangumiCategory): Promise<BangumiCollectionItem[]> {
  const items: BangumiCollectionItem[] = []
  const limit = 50
  let offset = 0
  let total = Number.POSITIVE_INFINITY

  while (offset < total && items.length < 1_000) {
    const url = new URL(`${settings.apiBaseUrl}/v0/users/${encodeURIComponent(settings.userId)}/collections`)
    url.searchParams.set("subject_type", String(bangumiCategoryDefinitions[category].subjectType))
    url.searchParams.set("limit", String(limit))
    url.searchParams.set("offset", String(offset))
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": settings.userAgent,
    }
    if (settings.accessToken) headers.Authorization = `Bearer ${settings.accessToken}`

    const response = await fetch(url, {
      headers,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    })
    if (!response.ok) throw new Error(errorMessage(response.status, await response.text()))
    const payload = await response.json() as PagedCollections
    const batch = Array.isArray(payload.data) ? payload.data : []
    total = Number.isFinite(payload.total) ? Number(payload.total) : offset + batch.length
    items.push(...batch.filter((item) => settings.includePrivate || !item.private))
    if (!batch.length || batch.length < limit) break
    offset += batch.length
  }

  return items.sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))
}

export function clearBangumiLibraryCache(): void {
  libraryCache.clear()
}

export async function getBangumiLibrary(
  settings: BangumiSettings,
  options: { bypassCache?: boolean } = {},
): Promise<BangumiLibrary> {
  if (settings.accessTokenError) throw new Error("已保存的访问令牌无法解密，请在后台重新填写")
  const key = cacheKey(settings)
  const cached = libraryCache.get(key)
  if (!options.bypassCache && cached && cached.expiresAt > Date.now()) return cached.value

  const sections: BangumiLibrarySection[] = []
  for (const category of settings.enabledCategories) {
    const items = await fetchCategory(settings, category)
    sections.push({
      id: category,
      label: bangumiCategoryDefinitions[category].label,
      count: items.length,
      items,
    })
  }
  const value: BangumiLibrary = {
    userId: settings.userId,
    profileUrl: `https://bgm.tv/user/${encodeURIComponent(settings.userId)}`,
    subjectBaseUrl: settings.subjectBaseUrl,
    sections,
    total: sections.reduce((sum, section) => sum + section.count, 0),
    fetchedAt: new Date().toISOString(),
  }
  libraryCache.set(key, { expiresAt: Date.now() + settings.cacheTtlSeconds * 1_000, value })
  return value
}
