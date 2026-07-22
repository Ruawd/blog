import { readAlbumUpload } from "@/lib/album-upload"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const image = readAlbumUpload((await params).name)
    return new Response(Uint8Array.from(image.body), {
      headers: {
        "Content-Type": image.type,
        "Content-Length": String(image.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
