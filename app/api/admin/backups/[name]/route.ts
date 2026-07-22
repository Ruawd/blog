import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import { deleteDatabaseBackup, readDatabaseBackup } from "@/lib/backup-repository"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ name: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  try {
    const name = (await params).name
    return new Response(Uint8Array.from(readDatabaseBackup(name)), {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "备份读取失败" }, { status: 404 })
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  try {
    if (!deleteDatabaseBackup((await params).name)) return Response.json({ error: "备份不存在" }, { status: 404 })
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "备份删除失败" }, { status: 400 })
  }
}
