import { requireAdminApi } from "@/lib/admin-session"
import { listAdminComments } from "@/lib/comment-repository"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  try {
    return Response.json({ comments: await listAdminComments() })
  } catch {
    return Response.json({ error: "互动内容暂时无法读取" }, { status: 500 })
  }
}
