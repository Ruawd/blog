import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import { getEditableArticle, normalizeArticleInput, saveArticle } from "@/lib/blog-repository"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response

  try {
    const { slug } = await params
    const post = await getEditableArticle(slug)
    if (!post) return Response.json({ error: "没有找到这篇文章" }, { status: 404 })
    return Response.json({ post })
  } catch {
    return Response.json({ error: "文章暂时无法读取，请稍后重试" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) {
    return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  }
  if (Number(request.headers.get("content-length") || 0) > 2_500_000) {
    return Response.json({ error: "文章内容过大" }, { status: 413 })
  }

  try {
    const { slug } = await params
    const current = await getEditableArticle(slug)
    if (!current) return Response.json({ error: "没有找到这篇文章" }, { status: 404 })

    const input = normalizeArticleInput(await request.json())
    if (input.slug !== slug) {
      return Response.json({ error: "已有文章的链接标识不能直接修改" }, { status: 409 })
    }
    if (current.protected && !input.protected) {
      return Response.json({ error: "密码保护文章不能直接取消保护" }, { status: 409 })
    }

    return Response.json({ post: await saveArticle(input, auth.user.username) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "文章保存失败"
    return Response.json({ error: message }, { status: 400 })
  }
}
