import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import {
  getProjectsRevision,
  listProjects,
  ProjectRevisionConflictError,
  saveProjects,
} from "@/lib/project-repository"
import { expirePublicCache, publicCacheTags } from "@/lib/public-cache"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response

  try {
    const projects = listProjects()
    return Response.json({ projects, revision: getProjectsRevision(projects) })
  } catch {
    return Response.json({ error: "项目暂时无法读取" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) {
    return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  }
  if (Number(request.headers.get("content-length") || 0) > 250_000) {
    return Response.json({ error: "项目数据过大" }, { status: 413 })
  }

  try {
    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > 250_000) {
      return Response.json({ error: "项目数据过大" }, { status: 413 })
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(rawBody)
    } catch {
      throw new Error("项目数据格式不正确")
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("项目数据格式不正确")
    }
    const body = parsed as Record<string, unknown>
    const projects = saveProjects(body.projects, auth.user.username, body.revision)
    expirePublicCache([publicCacheTags.projects], ["/projects", "/"])
    return Response.json({ projects, revision: getProjectsRevision(projects) })
  } catch (error) {
    if (error instanceof ProjectRevisionConflictError) {
      return Response.json({ error: error.message }, { status: 409 })
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "项目保存失败" },
      { status: 400 },
    )
  }
}
