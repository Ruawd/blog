import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

import { adminSessionSecret } from "@/lib/admin-session"
import { getCasdoorConfig } from "@/lib/casdoor-config"

export const CASDOOR_FLOW_COOKIE = "ruawd_admin_casdoor_flow"
const FLOW_DURATION_SECONDS = 10 * 60

type CasdoorFlow = {
  state: string
  verifier: string
  returnTo: string
  exp: number
}

type JsonRecord = Record<string, unknown>

function safeEqual(left: string, right: string): boolean {
  const leftDigest = createHmac("sha256", "casdoor-flow-compare").update(left).digest()
  const rightDigest = createHmac("sha256", "casdoor-flow-compare").update(right).digest()
  return timingSafeEqual(leftDigest, rightDigest)
}

function signFlow(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(`casdoor-flow.${encodedPayload}`).digest("base64url")
}

function encodeFlow(flow: CasdoorFlow, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(flow)).toString("base64url")
  return `${encodedPayload}.${signFlow(encodedPayload, secret)}`
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

export function safeAdminReturnTo(value: string | null | undefined): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/admin"
}

export function createCasdoorFlow(returnTo: string) {
  const secret = adminSessionSecret()
  if (!secret) return null

  const verifier = randomBytes(32).toString("base64url")
  const flow: CasdoorFlow = {
    state: randomBytes(24).toString("base64url"),
    verifier,
    returnTo: safeAdminReturnTo(returnTo),
    exp: Date.now() + FLOW_DURATION_SECONDS * 1000,
  }

  return {
    state: flow.state,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
    cookieValue: encodeFlow(flow, secret),
  }
}

export function decodeCasdoorFlow(value: string | undefined): CasdoorFlow | null {
  const secret = adminSessionSecret()
  if (!secret || !value) return null

  const [encodedPayload, signature, extra] = value.split(".")
  if (!encodedPayload || !signature || extra) return null
  if (!safeEqual(signature, signFlow(encodedPayload, secret))) return null

  try {
    const flow = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<CasdoorFlow>
    if (
      typeof flow.state !== "string"
      || typeof flow.verifier !== "string"
      || typeof flow.returnTo !== "string"
      || typeof flow.exp !== "number"
      || flow.exp <= Date.now()
    ) return null

    return {
      state: flow.state,
      verifier: flow.verifier,
      returnTo: safeAdminReturnTo(flow.returnTo),
      exp: flow.exp,
    }
  } catch {
    return null
  }
}

export function casdoorStateMatches(flow: CasdoorFlow, state: string | null): boolean {
  return Boolean(state && safeEqual(flow.state, state))
}

export function casdoorFlowCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE !== "false"
      : process.env.NODE_ENV === "production",
    path: "/api/auth/casdoor",
    maxAge: FLOW_DURATION_SECONDS,
  }
}

export async function exchangeCasdoorCode(code: string, verifier: string): Promise<string> {
  const config = getCasdoorConfig()
  if (!config) throw new Error("Casdoor 尚未配置")

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    code_verifier: verifier,
  })
  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  })
  const payload: unknown = await response.json().catch(() => null)
  const accessToken = isRecord(payload) && typeof payload.access_token === "string"
    ? payload.access_token
    : null
  if (!response.ok || !accessToken) throw new Error(`Casdoor 令牌交换失败 (${response.status})`)
  return accessToken
}

export async function getCasdoorUsername(accessToken: string): Promise<string> {
  const config = getCasdoorConfig()
  if (!config) throw new Error("Casdoor 尚未配置")

  const response = await fetch(config.userinfoEndpoint, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  })
  const payload: unknown = await response.json().catch(() => null)
  const profile = isRecord(payload) && isRecord(payload.data) ? payload.data : payload
  if (!response.ok || !isRecord(profile)) throw new Error(`Casdoor 用户信息读取失败 (${response.status})`)

  if (typeof profile.iss === "string" && profile.iss.replace(/\/$/, "") !== config.issuer) {
    throw new Error("Casdoor 用户信息签发方不匹配")
  }

  const username = typeof profile.preferred_username === "string"
    ? profile.preferred_username.trim()
    : ""
  if (!username) throw new Error("Casdoor 未返回唯一用户名")
  return username
}
