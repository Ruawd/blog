import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import {
  articleExists,
  listEditableArticleSummaries,
  normalizeArticleInput,
  saveArticle,
} from "@/lib/blog-repository"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response

  try {
    return Response.json({ posts: await listEditableArticleSummaries() })
  } catch {
    return Response.json({ error: "文章列表暂时无法读取，请稍后重试" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) {
    return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  }
  if (Number(request.headers.get("content-length") || 0) > 2_500_000) {
    return Response.json({ error: "文章内容过大" }, { status: 413 })
  }

  try {
    const input = normalizeArticleInput(await request.json())
    if (await articleExists(input.slug)) {
      return Response.json({ error: "这个链接标识已经被使用" }, { status: 409 })
    }

    return Response.json(
      { post: await saveArticle(input, auth.user.username) },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "文章保存失败"
    return Response.json({ error: message }, { status: 400 })
  }
}
