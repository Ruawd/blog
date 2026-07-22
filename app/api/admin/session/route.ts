import {
  clearAdminSession,
  createAdminSession,
  getAdminSession,
  isAdminConfigured,
  isSameOrigin,
  verifyAdminCredentials,
} from "@/lib/admin-session"

export const dynamic = "force-dynamic"

const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_ATTEMPT_LIMIT = 8

function requestAddress(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown"
}

function attemptState(key: string) {
  const now = Date.now()
  if (loginAttempts.size > 500) {
    for (const [storedKey, value] of loginAttempts) {
      if (value.resetAt <= now) loginAttempts.delete(storedKey)
    }
  }
  const current = loginAttempts.get(key)
  if (!current || current.resetAt <= now) return { count: 0, resetAt: now + LOGIN_WINDOW_MS }
  return current
}

export async function GET() {
  const user = await getAdminSession()
  return Response.json({ authenticated: Boolean(user), user })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  }
  if (!isAdminConfigured()) {
    return Response.json({ error: "服务器尚未配置管理员密码" }, { status: 503 })
  }
  if (Number(request.headers.get("content-length") || 0) > 8_192) {
    return Response.json({ error: "登录信息格式不正确" }, { status: 413 })
  }

  let credentials: { username?: unknown; password?: unknown }
  try {
    credentials = await request.json() as { username?: unknown; password?: unknown }
  } catch {
    return Response.json({ error: "登录信息格式不正确" }, { status: 400 })
  }

  const username = typeof credentials.username === "string" ? credentials.username : ""
  const password = typeof credentials.password === "string" ? credentials.password : ""
  const attemptKey = `${requestAddress(request)}:${username.trim().toLowerCase()}`
  const currentAttempt = attemptState(attemptKey)
  if (currentAttempt.count >= LOGIN_ATTEMPT_LIMIT) {
    return Response.json({ error: "登录尝试过多，请稍后再试" }, { status: 429 })
  }
  if (!verifyAdminCredentials(username, password)) {
    loginAttempts.set(attemptKey, { ...currentAttempt, count: currentAttempt.count + 1 })
    return Response.json({ error: "账号或密码不正确" }, { status: 401 })
  }

  loginAttempts.delete(attemptKey)
  await createAdminSession(username.trim())
  return Response.json({ authenticated: true })
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  }
  await clearAdminSession()
  return Response.json({ authenticated: false })
}
