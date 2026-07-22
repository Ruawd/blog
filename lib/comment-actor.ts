import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

const COOKIE_NAME = "ruawd_comment_actor"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

function actorSecret(): string {
  return process.env.SESSION_SECRET?.trim() || "local-comment-actor-secret"
}

function safeEqual(left: string, right: string): boolean {
  const key = "comment-actor-compare"
  const leftDigest = createHmac("sha256", key).update(left).digest()
  const rightDigest = createHmac("sha256", key).update(right).digest()
  return timingSafeEqual(leftDigest, rightDigest)
}

function sign(id: string): string {
  return createHmac("sha256", actorSecret()).update(`comment-actor:${id}`).digest("base64url")
}

function parseCookieHeader(header: string | null): string {
  if (!header) return ""
  for (const part of header.split(";")) {
    const [name, ...valueParts] = part.trim().split("=")
    if (name === COOKIE_NAME) return valueParts.join("=")
  }
  return ""
}

function validActorId(request: Request): string | null {
  const token = parseCookieHeader(request.headers.get("cookie"))
  const [id, signature, extra] = token.split(".")
  if (extra || !id || !signature || !/^[a-f0-9]{32}$/.test(id)) return null
  return safeEqual(signature, sign(id)) ? id : null
}

function actorHash(id: string): string {
  return createHmac("sha256", actorSecret()).update(`comment-interaction:${id}`).digest("hex")
}

function secureCookie(): boolean {
  return process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE !== "false"
    : process.env.NODE_ENV === "production"
}

function serializeCookie(id: string): string {
  return [
    `${COOKIE_NAME}=${id}.${sign(id)}`,
    "Path=/",
    `Max-Age=${COOKIE_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Lax",
    secureCookie() ? "Secure" : "",
  ].filter(Boolean).join("; ")
}

export function readCommentActorHash(request: Request): string {
  const id = validActorId(request)
  return id ? actorHash(id) : ""
}

export function ensureCommentActor(request: Request): { hash: string; setCookie: string | null } {
  const existingId = validActorId(request)
  if (existingId) return { hash: actorHash(existingId), setCookie: null }
  const id = randomUUID().replaceAll("-", "")
  return { hash: actorHash(id), setCookie: serializeCookie(id) }
}
