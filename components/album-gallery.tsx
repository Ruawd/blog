"use client"

import Image from "next/image"
import { useReducedMotion } from "motion/react"

import { BlurFade } from "@/components/ui/blur-fade"
import { Lens } from "@/components/ui/lens"

interface AlbumPhoto {
  readonly id: number
  readonly src: string
  readonly alt: string
  readonly caption: string
  readonly width: number
  readonly height: number
}

interface AlbumGalleryProps {
  photos: readonly AlbumPhoto[]
}

export function AlbumGallery({ photos }: AlbumGalleryProps) {
  const reduceMotion = useReducedMotion()

  return (
    <BlurFade duration={0.3} offset={14}>
      <div className="album-grid">
        {photos.map((photo, index) => {
          const number = String(index + 1).padStart(2, "0")
          const image = (
            <Image
              src={photo.src}
              alt={`${photo.alt} ${number}`}
              width={photo.width}
              height={photo.height}
              sizes="(max-width: 640px) 50vw, (max-width: 980px) 50vw, 33vw"
              unoptimized
              loading="lazy"
            />
          )

          return (
            <div className="album-item" key={photo.id}>
              <figure className="album-card">
                <Lens
                  zoomFactor={1.55}
                  lensSize={150}
                  duration={reduceMotion ? 0 : 0.12}
                  ariaLabel={`放大查看${photo.alt} ${number}`}
                >
                  {image}
                </Lens>
                <figcaption>
                  <span>{photo.caption || photo.alt}</span>
                  <span className="album-meta">{number}</span>
                </figcaption>
              </figure>
            </div>
          )
        })}
      </div>
    </BlurFade>
  )
}
