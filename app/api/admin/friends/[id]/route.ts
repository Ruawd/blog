import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import {
  deleteFriendLink,
  updateAdminFriendLink,
} from "@/lib/friend-repository"
import { expirePublicCache, publicCacheTags } from "@/lib/public-cache"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

function parseId(value: string): number {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("友链编号不正确")
  return id
}

export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  try {
    const friend = updateAdminFriendLink(parseId((await params).id), await request.json(), auth.user.username)
    if (!friend) return Response.json({ error: "没有找到这条友链" }, { status: 404 })
    expirePublicCache([publicCacheTags.friends], ["/friends"])
    return Response.json({ friend })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "友链保存失败" }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  try {
    if (!deleteFriendLink(parseId((await params).id))) {
      return Response.json({ error: "没有找到这条友链" }, { status: 404 })
    }
    expirePublicCache([publicCacheTags.friends], ["/friends"])
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "友链删除失败" }, { status: 400 })
  }
}
