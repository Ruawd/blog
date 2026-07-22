import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import { reviewAllFriendLinks } from "@/lib/friend-maintenance"
import { expirePublicCache, publicCacheTags } from "@/lib/public-cache"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  try {
    const result = await reviewAllFriendLinks(auth.user.username)
    expirePublicCache([publicCacheTags.friends], ["/friends"])
    return Response.json(result)
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "批量检查失败" }, { status: 500 })
  }
}
