import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import { listAlbumPhotos, saveAlbumPhotos } from "@/lib/album-repository"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response

  try {
    return Response.json({ photos: listAlbumPhotos() })
  } catch {
    return Response.json({ error: "相册图片暂时无法读取" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) {
    return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  }
  if (Number(request.headers.get("content-length") || 0) > 1_000_000) {
    return Response.json({ error: "相册数据过大" }, { status: 413 })
  }

  try {
    const body = await request.json() as Record<string, unknown>
    return Response.json({ photos: saveAlbumPhotos(body.photos, auth.user.username) })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "相册保存失败" },
      { status: 400 },
    )
  }
}
