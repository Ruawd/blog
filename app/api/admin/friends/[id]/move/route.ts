import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import { moveFriendLink } from "@/lib/friend-repository"
import { expirePublicCache, publicCacheTags } from "@/lib/public-cache"

export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  try {
    const id = Number((await params).id)
    if (!Number.isSafeInteger(id) || id < 1) throw new Error("友链编号不正确")
    const body = await request.json() as Record<string, unknown>
    if (body.direction !== "up" && body.direction !== "down") throw new Error("移动方向不正确")
    const friends = moveFriendLink(id, body.direction)
    expirePublicCache([publicCacheTags.friends], ["/friends"])
    return Response.json({ friends })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "友链排序失败" }, { status: 400 })
  }
}
