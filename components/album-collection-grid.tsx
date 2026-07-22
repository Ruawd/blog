import Link from "next/link"
import { ArrowRight, Images } from "lucide-react"

import { ResilientImage } from "@/components/resilient-image"
import { MagicCard } from "@/components/ui/magic-card"
import type { AlbumCollection } from "@/lib/album-repository"

export function AlbumCollectionGrid({ albums }: { albums: readonly AlbumCollection[] }) {
  return (
    <div className="album-collection-grid">
      {albums.map((album, index) => {
        const cover = album.coverSrc || album.photos[0]?.src || "/blog-media/image-unavailable.svg"
        return (
          <MagicCard className="album-collection-magic" key={album.slug}>
            <Link className="album-collection-card" href={`/mine/album/${album.slug}`}>
              <div className="album-collection-cover">
                <ResilientImage src={cover} alt={`${album.title}封面`} loading={index < 2 ? "eager" : "lazy"} decoding="async" />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="album-collection-copy">
                <p>{album.period || "ALBUM COLLECTION"}</p>
                <h3>{album.title}</h3>
                <span>{album.description || "收录值得留下的图片与片段。"}</span>
                <footer>
                  <span><Images aria-hidden="true" />{album.photoCount} 张图片</span>
                  <strong>打开相册 <ArrowRight aria-hidden="true" /></strong>
                </footer>
              </div>
            </Link>
          </MagicCard>
        )
      })}
    </div>
  )
}
