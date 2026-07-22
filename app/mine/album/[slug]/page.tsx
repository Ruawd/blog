import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"

import { AlbumGallery } from "@/components/album-gallery"
import { SiteFrame } from "@/components/site-frame"
import { getCachedAlbumCollection } from "@/lib/album-repository"

type AlbumDetailPageProps = { params: Promise<{ slug: string }> }

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: AlbumDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const album = await getCachedAlbumCollection(slug)
  if (!album) return { title: "相册不存在" }
  const cover = album.coverSrc || album.photos[0]?.src
  return {
    title: album.title,
    description: album.description || `${album.title}，共 ${album.photoCount} 张图片。`,
    alternates: { canonical: `/mine/album/${album.slug}` },
    openGraph: cover ? { images: [{ url: cover, alt: `${album.title}封面` }] } : undefined,
  }
}

export default async function AlbumDetailPage({ params }: AlbumDetailPageProps) {
  const { slug } = await params
  const album = await getCachedAlbumCollection(slug)
  if (!album) notFound()

  return (
    <SiteFrame
      eyebrow={`ALBUM / ${album.slug.toUpperCase()}`}
      title={album.title}
      description={album.description || "收录值得留下的图片与片段。"}
    >
      <Link className="album-back-link" href="/mine/album"><ArrowLeft aria-hidden="true" />返回全部相册</Link>
      <section className="page-section album-detail-section" aria-labelledby="album-gallery-title">
        <header className="page-section-heading">
          <div>
            <p className="section-kicker">GALLERY / {album.slug.toUpperCase()}</p>
            <h2 id="album-gallery-title">全部图片</h2>
          </div>
          <p>{album.period ? `${album.period} · ` : ""}共 {album.photoCount} 张</p>
        </header>

        {album.photos.length ? (
          <AlbumGallery photos={album.photos} />
        ) : (
          <div className="album-empty">这个子相册暂时还没有图片。</div>
        )}
      </section>
    </SiteFrame>
  )
}
