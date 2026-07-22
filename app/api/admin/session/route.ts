import {
  clearAdminSession,
  getAdminSession,
  isSameOrigin,
} from "@/lib/admin-session"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getAdminSession()
  return Response.json({ authenticated: Boolean(user), user })
}

export async function POST() {
  return Response.json(
    { error: "请使用 Casdoor 登录" },
    { status: 405, headers: { allow: "GET, DELETE" } },
  )
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  }
  await clearAdminSession()
  return Response.json({ authenticated: false })
}
