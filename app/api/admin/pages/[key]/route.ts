import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import { savePageContent } from "@/lib/page-content"

export const dynamic = "force-dynamic"

export async function PUT(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  if (Number(request.headers.get("content-length") || 0) > 250_000) {
    return Response.json({ error: "页面内容过大" }, { status: 413 })
  }
  try {
    const { key } = await params
    const body = await request.json() as Record<string, unknown>
    if (body.key !== key) return Response.json({ error: "页面标识不能修改" }, { status: 409 })
    return Response.json({ page: await savePageContent(body, auth.user.username) })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "页面保存失败" }, { status: 400 })
  }
}
