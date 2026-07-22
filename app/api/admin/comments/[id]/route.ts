import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import { deleteComment, setCommentStatus, type CommentStatus } from "@/lib/comment-repository"

export const dynamic = "force-dynamic"

function parseId(value: string): number {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("互动内容编号不正确")
  return id
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  try {
    const { id } = await params
    const body = await request.json() as { status?: CommentStatus }
    if (body.status !== "approved" && body.status !== "hidden") throw new Error("显示状态不正确")
    const comment = await setCommentStatus(parseId(id), body.status)
    if (!comment) return Response.json({ error: "没有找到这条互动内容" }, { status: 404 })
    return Response.json({ comment })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "状态更新失败" }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  try {
    const { id } = await params
    if (!await deleteComment(parseId(id))) return Response.json({ error: "没有找到这条互动内容" }, { status: 404 })
    return new Response(null, { status: 204 })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "删除失败" }, { status: 400 })
  }
}
