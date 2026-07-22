import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import { stageDatabaseRestore } from "@/lib/backup-repository"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  if (Number(request.headers.get("content-length") || 0) > 105 * 1024 * 1024) {
    return Response.json({ error: "恢复文件过大" }, { status: 413 })
  }
  try {
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) throw new Error("请选择 SQLite 备份文件")
    stageDatabaseRestore(Buffer.from(await file.arrayBuffer()))
    return Response.json({ ok: true, restartRequired: true })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "恢复文件校验失败" }, { status: 400 })
  }
}
