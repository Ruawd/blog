import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import { createDatabaseBackup, listDatabaseBackups } from "@/lib/backup-repository"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  return Response.json({ backups: listDatabaseBackups() })
}

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  try {
    return Response.json({ backup: await createDatabaseBackup(), backups: listDatabaseBackups() }, { status: 201 })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "数据库备份失败" }, { status: 500 })
  }
}
