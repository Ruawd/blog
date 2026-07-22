import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import { deletePostAutosave, getEditableArticle, getPostAutosave, savePostAutosave } from "@/lib/blog-repository"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  const { slug } = await params
  return Response.json({ autosave: getPostAutosave(slug) })
}

export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  if (Number(request.headers.get("content-length") || 0) > 2_500_000) {
    return Response.json({ error: "自动保存内容过大" }, { status: 413 })
  }
  try {
    const { slug } = await params
    const current = await getEditableArticle(slug)
    if (!current) return Response.json({ error: "没有找到这篇文章" }, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    return Response.json({ autosave: savePostAutosave(slug, body.article, auth.user.username) })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "自动保存失败" }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  deletePostAutosave((await params).slug)
  return Response.json({ ok: true })
}
