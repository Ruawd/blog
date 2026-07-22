import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import { reviewFriendCandidate } from "@/lib/friend-review"
import { applyFriendReview, getFriendLink } from "@/lib/friend-repository"

export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  try {
    const id = Number((await params).id)
    if (!Number.isSafeInteger(id) || id < 1) throw new Error("友链编号不正确")
    const current = getFriendLink(id)
    if (!current) return Response.json({ error: "没有找到这条友链" }, { status: 404 })
    if (!current.backlinkUrl) return Response.json({ error: "请先填写对方的友链页面" }, { status: 400 })
    const review = await reviewFriendCandidate(current)
    const friend = applyFriendReview(id, review, auth.user.username)
    return Response.json({ friend, review })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "自动审核失败" }, { status: 400 })
  }
}
