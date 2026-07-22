import type { Metadata } from "next"

import { AlbumGallery } from "@/components/album-gallery"
import { SiteFrame } from "@/components/site-frame"
import { ManagedPageBody } from "@/components/managed-page-body"
import { albumPhotos } from "@/lib/migrated-content"
import { getPageContent } from "@/lib/page-content"

export const metadata: Metadata = {
  title: "相册",
  description: "可爱流萤与 Ruawd 的相册收藏。",
}

export const dynamic = "force-dynamic"

export default async function AlbumPage() {
  const page = await getPageContent("album")
  return (
    <SiteFrame
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    >
      <ManagedPageBody content={page.body} />
      <section className="page-section" aria-labelledby="album-title">
        <header className="page-section-heading">
          <div>
            <p className="section-kicker">FIREFLY · 2026</p>
            <h2 id="album-title">可爱流萤</h2>
          </div>
          <p>崩坏：星穹铁道 · 2026.01.01 · 共 {albumPhotos.length} 张</p>
        </header>

        <AlbumGallery photos={albumPhotos} />
      </section>
    </SiteFrame>
  )
}
