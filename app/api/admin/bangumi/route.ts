import { clearBangumiLibraryCache, getBangumiLibrary } from "@/lib/bangumi-api"
import { isSameOrigin, requireAdminApi } from "@/lib/admin-session"
import {
  getBangumiSettings,
  mergeBangumiSettingsInput,
  saveBangumiSettings,
  toBangumiAdminSettings,
} from "@/lib/bangumi-settings"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  return Response.json({ settings: toBangumiAdminSettings(getBangumiSettings()) })
}

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  if (Number(request.headers.get("content-length") || 0) > 20_000) {
    return Response.json({ error: "Bangumi 配置内容过大" }, { status: 413 })
  }
  try {
    const settings = mergeBangumiSettingsInput(await request.json())
    const library = await getBangumiLibrary(settings, { bypassCache: true })
    return Response.json({
      ok: true,
      userId: library.userId,
      total: library.total,
      sections: library.sections.map(({ id, label, count }) => ({ id, label, count })),
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Bangumi API 连接失败" },
      { status: 400 },
    )
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminApi()
  if (!auth.ok) return auth.response
  if (!isSameOrigin(request)) return Response.json({ error: "请求来源校验失败" }, { status: 403 })
  if (Number(request.headers.get("content-length") || 0) > 20_000) {
    return Response.json({ error: "Bangumi 配置内容过大" }, { status: 413 })
  }
  try {
    const settings = saveBangumiSettings(await request.json(), auth.user.username)
    clearBangumiLibraryCache()
    return Response.json({ settings: toBangumiAdminSettings(settings) })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Bangumi 配置保存失败" },
      { status: 400 },
    )
  }
}
