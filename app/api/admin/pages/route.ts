import { requireAdminApi } from "@/lib/admin-session"
import { listPageContents } from "@/lib/page-content"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  try {
    return Response.json({ pages: await listPageContents() })
  } catch {
    return Response.json({ error: "页面内容暂时无法读取" }, { status: 500 })
  }
}
