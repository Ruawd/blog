import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { getCasdoorConfig } from "@/lib/casdoor-config"

const COOKIE_NAME = "ruawd_admin_session"
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7

type SessionPayload = {
  username: string
  exp: number
}

export type AdminUser = {
  username: string
}

function safeEqual(left: string, right: string): boolean {
  const leftDigest = createHmac("sha256", "credential-compare").update(left).digest()
  const rightDigest = createHmac("sha256", "credential-compare").update(right).digest()
  return timingSafeEqual(leftDigest, rightDigest)
}

export function adminSessionSecret(): string | null {
  const value = process.env.SESSION_SECRET?.trim()
  return value && value.length >= 32 ? value : null
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url")
}

function encodeSession(payload: SessionPayload, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${encodedPayload}.${signPayload(encodedPayload, secret)}`
}

function decodeSession(token: string, secret: string): SessionPayload | null {
  const [encodedPayload, signature, extra] = token.split(".")
  if (!encodedPayload || !signature || extra) return null
  const expectedSignature = signPayload(encodedPayload, secret)
  if (!safeEqual(signature, expectedSignature)) return null

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload
    if (!payload.username || !Number.isFinite(payload.exp) || payload.exp <= Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function isAdminConfigured(): boolean {
  return Boolean(adminSessionSecret() && getCasdoorConfig())
}

export function createAdminSessionCookie(username: string) {
  const secret = adminSessionSecret()
  if (!secret) throw new Error("管理员会话尚未配置")

  const config = getCasdoorConfig()
  if (!config || username !== config.allowedUsername) throw new Error("该 Casdoor 用户无权访问后台")

  return {
    name: COOKIE_NAME,
    value: encodeSession({ username, exp: Date.now() + SESSION_DURATION_SECONDS * 1000 }, secret),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.COOKIE_SECURE
        ? process.env.COOKIE_SECURE !== "false"
        : process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    },
  }
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE !== "false"
      : process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}

export async function getAdminSession(): Promise<AdminUser | null> {
  const secret = adminSessionSecret()
  if (!secret) return null
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = decodeSession(token, secret)
  return payload ? { username: payload.username } : null
}

export async function requireAdminSession(returnTo = "/admin"): Promise<AdminUser> {
  const user = await getAdminSession()
  if (user) return user
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/admin"
  redirect(`/admin/login?return_to=${encodeURIComponent(safeReturnTo)}`)
}

export async function requireAdminApi(): Promise<
  | { ok: true; user: AdminUser }
  | { ok: false; response: Response }
> {
  const user = await getAdminSession()
  if (!user) {
    return { ok: false, response: Response.json({ error: "请先登录后再管理文章" }, { status: 401 }) }
  }
  return { ok: true, user }
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return false

  try {
    const originUrl = new URL(origin)
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
    const requestHost = forwardedHost || request.headers.get("host") || new URL(request.url).host
    return originUrl.host === requestHost
  } catch {
    return false
  }
}
