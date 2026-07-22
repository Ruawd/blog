import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import { getEditableArticle, listPostRevisions, restorePostRevision } from "@/lib/blog-repository"
import { expirePublicCache, publicCacheTags } from "@/lib/public-cache"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  const { slug } = await params
  if (!await getEditableArticle(slug)) return Response.json({ error: "没有找到这篇文章" }, { status: 404 })
  return Response.json({ revisions: listPostRevisions(slug) })
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  try {
    const { slug } = await params
    const body = await request.json() as Record<string, unknown>
    const revisionId = Number(body.revisionId)
    const post = await restorePostRevision(revisionId, slug, auth.user.username)
    if (!post) return Response.json({ error: "没有找到这个历史版本" }, { status: 404 })
    expirePublicCache([publicCacheTags.blog], ["/", "/blog", `/blog/${slug}`])
    return Response.json({ post, revisions: listPostRevisions(slug) })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "历史版本恢复失败" }, { status: 400 })
  }
}
