import { isSameOrigin } from "@/lib/admin-session"
import { getPublishedBlogPost } from "@/lib/blog-repository"
import { readCommentActorHash } from "@/lib/comment-actor"
import { notifyCommentPublished } from "@/lib/comment-notifications"
import { createComment, getCommentNotificationContext, listPublicCommentPage } from "@/lib/comment-repository"
import { clientAddress } from "@/lib/request-client"
import { consumeRateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  try {
    const page = await listPublicCommentPage(
      url.searchParams.get("scope"),
      url.searchParams.get("target"),
      readCommentActorHash(request),
      {
        limit: Number(url.searchParams.get("limit") || 12),
        before: url.searchParams.get("before"),
        focus: url.searchParams.get("focus"),
      },
    )
    return Response.json(page)
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "评论读取失败" }, { status: 400 })
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  if (Number(request.headers.get("content-length") || 0) > 20_000) {
    return Response.json({ error: "留言内容过大" }, { status: 413 })
  }
  const address = clientAddress(request)
  const limit = consumeRateLimit({ action: "comment-create", actor: address, limit: 10, windowMs: 10 * 60_000 })
  if (!limit.allowed) {
    return Response.json({ error: "提交太频繁，请稍后再试" }, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    })
  }

  try {
    const body = await request.json() as Record<string, unknown>
    if (body.scope === "article" && (typeof body.target !== "string" || !await getPublishedBlogPost(body.target))) {
      return Response.json({ error: "没有找到要评论的文章" }, { status: 404 })
    }
    const comment = await createComment(body, address)
    const notification = getCommentNotificationContext(comment.id)
    if (notification) await notifyCommentPublished(notification)
    return Response.json({ comment }, { status: 201 })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "留言提交失败" }, { status: 400 })
  }
}
