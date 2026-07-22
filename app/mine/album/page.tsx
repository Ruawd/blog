import type { Metadata } from "next"

import { AlbumCollectionGrid } from "@/components/album-collection-grid"
import { SiteFrame } from "@/components/site-frame"
import { ManagedPageBody } from "@/components/managed-page-body"
import { listCachedAlbumCollections } from "@/lib/album-repository"
import { getPageContent } from "@/lib/page-content"

export const metadata: Metadata = {
  title: "相册",
  description: "Ruawd 的子相册与影像收藏。",
  alternates: { canonical: "/mine/album" },
}

export const dynamic = "force-dynamic"

export default async function AlbumPage() {
  const page = await getPageContent("album")
  const albums = await listCachedAlbumCollections()
  return (
    <SiteFrame
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    >
      <ManagedPageBody content={page.body} />
      <section className="page-section" aria-labelledby="album-collections-title">
        <header className="page-section-heading">
          <div>
            <p className="section-kicker">COLLECTIONS / ALBUMS</p>
            <h2 id="album-collections-title">子相册</h2>
          </div>
          <p>{albums.length} 个相册 · 共 {albums.reduce((total, album) => total + album.photoCount, 0)} 张图片</p>
        </header>

        {albums.length ? (
          <AlbumCollectionGrid albums={albums} />
        ) : (
          <div className="album-empty">暂时还没有子相册。</div>
        )}
      </section>
    </SiteFrame>
  )
}
