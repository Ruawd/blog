import { createDatabaseBackup, listDatabaseBackups } from "@/lib/backup-repository"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    return Response.json({ backup: await createDatabaseBackup(), backups: listDatabaseBackups() }, { status: 201 })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Backup failed" }, { status: 500 })
  }
}
