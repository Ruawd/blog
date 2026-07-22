import type { Metadata } from "next"
import Image from "next/image"

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

        <div className="album-grid">
          {albumPhotos.map((photo, index) => (
            <figure className="album-card" key={photo.src}>
              <Image
                src={photo.src}
                alt={`${photo.alt} ${String(index + 1).padStart(2, "0")}`}
                width={photo.width}
                height={photo.height}
                sizes="(max-width: 640px) 50vw, (max-width: 980px) 50vw, 33vw"
                unoptimized
                loading="lazy"
              />
              <figcaption>
                <span>可爱流萤</span>
                <span className="album-meta">{String(index + 1).padStart(2, "0")}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </SiteFrame>
  )
}
