import { isSameOrigin } from "@/lib/admin-session"
import { getPublishedBlogPost } from "@/lib/blog-repository"
import { ensureCommentActor } from "@/lib/comment-actor"
import { recordPostView } from "@/lib/post-view-repository"
import { clientAddress } from "@/lib/request-client"
import { consumeRateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })

  const limit = consumeRateLimit({
    action: "post-view",
    actor: clientAddress(request),
    limit: 120,
    windowMs: 10 * 60_000,
  })
  if (!limit.allowed) {
    return Response.json({ error: "浏览请求太频繁，请稍后再试" }, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    })
  }

  try {
    const { slug } = await params
    if (!await getPublishedBlogPost(slug)) {
      return Response.json({ error: "没有找到这篇文章" }, { status: 404 })
    }
    const actor = ensureCommentActor(request)
    const result = recordPostView(slug, actor.hash)
    return Response.json(result, {
      headers: {
        "Cache-Control": "private, no-store",
        ...(actor.setCookie ? { "set-cookie": actor.setCookie } : {}),
      },
    })
  } catch {
    return Response.json({ error: "浏览次数记录失败" }, { status: 500 })
  }
}
