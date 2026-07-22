import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import { persistAlbumUpload } from "@/lib/album-upload"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  if (Number(request.headers.get("content-length") || 0) > 21 * 1024 * 1024) {
    return Response.json({ error: "图片文件过大" }, { status: 413 })
  }
  try {
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) throw new Error("请选择图片文件")
    return Response.json({ upload: await persistAlbumUpload(file) }, { status: 201 })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "图片上传失败" }, { status: 400 })
  }
}
