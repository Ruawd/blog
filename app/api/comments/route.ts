import { isSameOrigin } from "@/lib/admin-session"
import { getPublishedBlogPost } from "@/lib/blog-repository"
import { createComment, listPublicComments } from "@/lib/comment-repository"

export const dynamic = "force-dynamic"

const attempts = new Map<string, number[]>()

function clientAddress(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local"
}

function isRateLimited(address: string): boolean {
  const now = Date.now()
  const recent = (attempts.get(address) ?? []).filter((time) => now - time < 10 * 60_000)
  attempts.set(address, recent)
  if (recent.length >= 5) return true
  recent.push(now)
  return false
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  try {
    return Response.json({
      comments: await listPublicComments(url.searchParams.get("scope"), url.searchParams.get("target")),
    })
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
  if (isRateLimited(address)) return Response.json({ error: "提交太频繁，请十分钟后再试" }, { status: 429 })

  try {
    const body = await request.json() as Record<string, unknown>
    if (body.scope === "article" && (typeof body.target !== "string" || !await getPublishedBlogPost(body.target))) {
      return Response.json({ error: "没有找到要评论的文章" }, { status: 404 })
    }
    return Response.json({ comment: await createComment(body, address) }, { status: 201 })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "留言提交失败" }, { status: 400 })
  }
}
