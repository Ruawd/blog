import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"

import { getDatabase } from "@/db"

export const bangumiCategoryDefinitions = {
  anime: { label: "动画", subjectType: 2 },
  book: { label: "书籍", subjectType: 1 },
  music: { label: "音乐", subjectType: 3 },
  game: { label: "游戏", subjectType: 4 },
} as const

export type BangumiCategory = keyof typeof bangumiCategoryDefinitions

export type BangumiSettings = {
  userId: string
  apiBaseUrl: string
  subjectBaseUrl: string
  userAgent: string
  enabledCategories: BangumiCategory[]
  cacheTtlSeconds: number
  includePrivate: boolean
  accessToken: string
  accessTokenConfigured: boolean
  accessTokenError: boolean
  updatedAt: string | null
}

export type BangumiAdminSettings = Omit<BangumiSettings, "accessToken">

export const defaultBangumiSettings: BangumiSettings = {
  userId: "ruawd",
  apiBaseUrl: "https://api.bgm.tv",
  subjectBaseUrl: "https://bgm.tv/subject/",
  userAgent: "RuawdBlog/1.0 (https://blog.ruawd.de)",
  enabledCategories: ["anime", "book", "music", "game"],
  cacheTtlSeconds: 900,
  includePrivate: false,
  accessToken: "",
  accessTokenConfigured: false,
  accessTokenError: false,
  updatedAt: null,
}

type BangumiSettingsRow = {
  userId: string
  apiBaseUrl: string
  subjectBaseUrl: string
  userAgent: string
  enabledCategoriesJson: string
  cacheTtlSeconds: number
  includePrivate: number
  encryptedAccessToken: string
  updatedAt: string
}

let schemaReady = false

function ensureBangumiSettingsSchema(): DatabaseSync {
  const db = getDatabase()
  if (!schemaReady) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS bangumi_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        user_id TEXT NOT NULL,
        api_base_url TEXT NOT NULL,
        subject_base_url TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        enabled_categories_json TEXT NOT NULL DEFAULT '["anime","book","music","game"]',
        cache_ttl_seconds INTEGER NOT NULL DEFAULT 900,
        include_private INTEGER NOT NULL DEFAULT 0,
        encrypted_access_token TEXT NOT NULL DEFAULT '',
        updated_by TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    schemaReady = true
  }
  return db
}

function encryptionKey(): Buffer | null {
  const secret = process.env.SESSION_SECRET?.trim()
  return secret && secret.length >= 32
    ? createHash("sha256").update(secret).digest()
    : null
}

function encryptAccessToken(token: string): string {
  if (!token) return ""
  const key = encryptionKey()
  if (!key) throw new Error("请先配置至少 32 位的 SESSION_SECRET，再保存 Bangumi 访问令牌")
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".")
}

function decryptAccessToken(value: string): { token: string; error: boolean } {
  if (!value) return { token: "", error: false }
  const [version, ivValue, tagValue, encryptedValue, extra] = value.split(".")
  const key = encryptionKey()
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue || extra || !key) {
    return { token: "", error: true }
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"))
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
    return {
      token: Buffer.concat([
        decipher.update(Buffer.from(encryptedValue, "base64url")),
        decipher.final(),
      ]).toString("utf8"),
      error: false,
    }
  } catch {
    return { token: "", error: true }
  }
}

function parseCategories(value: string): BangumiCategory[] {
  try {
    const input = JSON.parse(value)
    if (!Array.isArray(input)) return defaultBangumiSettings.enabledCategories
    const categories = input.filter(
      (item): item is BangumiCategory => typeof item === "string" && item in bangumiCategoryDefinitions,
    )
    return categories.length ? [...new Set(categories)] : defaultBangumiSettings.enabledCategories
  } catch {
    return defaultBangumiSettings.enabledCategories
  }
}

function readSettingsRow(): BangumiSettingsRow | undefined {
  return ensureBangumiSettingsSchema().prepare(`
    SELECT
      user_id AS userId,
      api_base_url AS apiBaseUrl,
      subject_base_url AS subjectBaseUrl,
      user_agent AS userAgent,
      enabled_categories_json AS enabledCategoriesJson,
      cache_ttl_seconds AS cacheTtlSeconds,
      include_private AS includePrivate,
      encrypted_access_token AS encryptedAccessToken,
      updated_at AS updatedAt
    FROM bangumi_settings
    WHERE id = 1
    LIMIT 1
  `).get() as unknown as BangumiSettingsRow | undefined
}

export function getBangumiSettings(): BangumiSettings {
  const row = readSettingsRow()
  if (!row) return { ...defaultBangumiSettings, enabledCategories: [...defaultBangumiSettings.enabledCategories] }
  const accessToken = decryptAccessToken(row.encryptedAccessToken)
  return {
    userId: row.userId,
    apiBaseUrl: row.apiBaseUrl,
    subjectBaseUrl: row.subjectBaseUrl,
    userAgent: row.userAgent,
    enabledCategories: parseCategories(row.enabledCategoriesJson),
    cacheTtlSeconds: row.cacheTtlSeconds,
    includePrivate: row.includePrivate === 1,
    accessToken: accessToken.token,
    accessTokenConfigured: Boolean(row.encryptedAccessToken),
    accessTokenError: accessToken.error,
    updatedAt: row.updatedAt,
  }
}

export function toBangumiAdminSettings(settings: BangumiSettings): BangumiAdminSettings {
  return {
    userId: settings.userId,
    apiBaseUrl: settings.apiBaseUrl,
    subjectBaseUrl: settings.subjectBaseUrl,
    userAgent: settings.userAgent,
    enabledCategories: settings.enabledCategories,
    cacheTtlSeconds: settings.cacheTtlSeconds,
    includePrivate: settings.includePrivate,
    accessTokenConfigured: settings.accessTokenConfigured,
    accessTokenError: settings.accessTokenError,
    updatedAt: settings.updatedAt,
  }
}

function normalizeRemoteUrl(value: unknown, label: string, options?: { trailingSlash?: boolean }): string {
  const raw = typeof value === "string" ? value.trim() : ""
  if (!raw) throw new Error(`${label}不能为空`)
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`${label}格式不正确`)
  }
  if (url.protocol !== "https:") throw new Error(`${label}必须使用 HTTPS`)
  if (url.username || url.password || url.search || url.hash) throw new Error(`${label}不能包含凭据、查询参数或锚点`)
  const hostname = url.hostname.toLowerCase()
  const privateIpv4 = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/
  const privateIpv6 = hostname === "::1" || hostname === "[::1]" || /^\[?(?:fc|fd)[0-9a-f]{2}:/.test(hostname) || /^\[?fe80:/.test(hostname)
  if (hostname === "localhost" || hostname.endsWith(".local") || privateIpv6 || privateIpv4.test(hostname)) {
    throw new Error(`${label}不能指向本机或内网地址`)
  }
  url.pathname = url.pathname.replace(/\/+$/, "") || "/"
  const normalized = url.toString()
  return options?.trailingSlash ? `${normalized.replace(/\/+$/, "")}/` : normalized.replace(/\/+$/, "")
}

function normalizeCategories(value: unknown): BangumiCategory[] {
  if (!Array.isArray(value)) throw new Error("至少选择一个番组分类")
  const categories = value.filter(
    (item): item is BangumiCategory => typeof item === "string" && item in bangumiCategoryDefinitions,
  )
  const unique = [...new Set(categories)]
  if (!unique.length) throw new Error("至少选择一个番组分类")
  return unique
}

export type BangumiSettingsInput = {
  userId: string
  apiBaseUrl: string
  subjectBaseUrl: string
  userAgent: string
  enabledCategories: BangumiCategory[]
  cacheTtlSeconds: number
  includePrivate: boolean
  accessToken: string
  removeAccessToken: boolean
}

export function normalizeBangumiSettingsInput(value: unknown): BangumiSettingsInput {
  if (!value || typeof value !== "object") throw new Error("Bangumi 配置格式不正确")
  const input = value as Record<string, unknown>
  const userId = typeof input.userId === "string" ? input.userId.trim() : ""
  if (!userId || userId.length > 80 || /[\s/?#]/.test(userId)) throw new Error("Bangumi 用户 ID 格式不正确")
  const userAgent = typeof input.userAgent === "string" ? input.userAgent.trim() : ""
  if (userAgent.length < 8 || userAgent.length > 200 || /[\r\n]/.test(userAgent)) {
    throw new Error("User-Agent 需要填写 8 到 200 个字符的站点标识")
  }
  const cacheTtlSeconds = Number(input.cacheTtlSeconds)
  if (!Number.isInteger(cacheTtlSeconds) || cacheTtlSeconds < 60 || cacheTtlSeconds > 86_400) {
    throw new Error("缓存时间需在 60 到 86400 秒之间")
  }
  const accessToken = typeof input.accessToken === "string" ? input.accessToken.trim() : ""
  if (accessToken.length > 2_000 || /[\r\n]/.test(accessToken)) throw new Error("访问令牌格式不正确")
  return {
    userId,
    apiBaseUrl: normalizeRemoteUrl(input.apiBaseUrl, "API 根地址"),
    subjectBaseUrl: normalizeRemoteUrl(input.subjectBaseUrl, "条目链接地址", { trailingSlash: true }),
    userAgent,
    enabledCategories: normalizeCategories(input.enabledCategories),
    cacheTtlSeconds,
    includePrivate: input.includePrivate === true,
    accessToken,
    removeAccessToken: input.removeAccessToken === true,
  }
}

export function mergeBangumiSettingsInput(value: unknown): BangumiSettings {
  const input = normalizeBangumiSettingsInput(value)
  const current = getBangumiSettings()
  return {
    ...current,
    ...input,
    accessToken: input.removeAccessToken ? "" : input.accessToken || current.accessToken,
    accessTokenConfigured: input.removeAccessToken ? false : Boolean(input.accessToken || current.accessToken),
    accessTokenError: false,
  }
}

export function saveBangumiSettings(value: unknown, username: string): BangumiSettings {
  const next = mergeBangumiSettingsInput(value)
  const now = new Date().toISOString()
  const encryptedAccessToken = encryptAccessToken(next.accessToken)
  ensureBangumiSettingsSchema().prepare(`
    INSERT INTO bangumi_settings (
      id, user_id, api_base_url, subject_base_url, user_agent,
      enabled_categories_json, cache_ttl_seconds, include_private,
      encrypted_access_token, updated_by, updated_at
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      api_base_url = excluded.api_base_url,
      subject_base_url = excluded.subject_base_url,
      user_agent = excluded.user_agent,
      enabled_categories_json = excluded.enabled_categories_json,
      cache_ttl_seconds = excluded.cache_ttl_seconds,
      include_private = excluded.include_private,
      encrypted_access_token = excluded.encrypted_access_token,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `).run(
    next.userId,
    next.apiBaseUrl,
    next.subjectBaseUrl,
    next.userAgent,
    JSON.stringify(next.enabledCategories),
    next.cacheTtlSeconds,
    next.includePrivate ? 1 : 0,
    encryptedAccessToken,
    username,
    now,
  )
  return getBangumiSettings()
}
