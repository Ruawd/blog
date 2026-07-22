import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import {
  createAdminFriendLink,
  listAdminFriendLinks,
} from "@/lib/friend-repository"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  try {
    return Response.json({ friends: listAdminFriendLinks() })
  } catch {
    return Response.json({ error: "友链暂时无法读取" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  if (Number(request.headers.get("content-length") || 0) > 30_000) {
    return Response.json({ error: "友链内容过大" }, { status: 413 })
  }
  try {
    return Response.json({
      friend: createAdminFriendLink(await request.json(), auth.user.username),
    }, { status: 201 })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "友链创建失败" }, { status: 400 })
  }
}
