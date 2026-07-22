"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Download, Maximize2, X } from "lucide-react"
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
  readonly takenAt: string
  readonly originalName: string
}

interface AlbumGalleryProps {
  photos: readonly AlbumPhoto[]
}

export function AlbumGallery({ photos }: AlbumGalleryProps) {
  const reduceMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const pointerStart = useRef<number | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const activePhoto = activeIndex === null ? null : photos[activeIndex]
  const lightboxOpen = activeIndex !== null

  useEffect(() => {
    if (!lightboxOpen) return
    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null)
      if (event.key === "ArrowLeft") setActiveIndex((current) => current === null ? null : (current - 1 + photos.length) % photos.length)
      if (event.key === "ArrowRight") setActiveIndex((current) => current === null ? null : (current + 1) % photos.length)
      if (event.key === "Tab") {
        const focusable = [...document.querySelectorAll<HTMLElement>(
          '.album-lightbox a[href], .album-lightbox button:not([disabled])',
        )]
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (first && last && event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (first && last && !event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", handleKeyDown)
    window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleKeyDown)
      window.requestAnimationFrame(() => previouslyFocused?.focus())
    }
  }, [lightboxOpen, photos.length])

  function navigate(offset: -1 | 1) {
    setActiveIndex((current) => current === null ? null : (current + offset + photos.length) % photos.length)
  }

  return (
    <>
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
              unoptimized={photo.src.startsWith("http")}
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
                  onActivate={() => setActiveIndex(index)}
                >
                  {image}
                </Lens>
                <span className="album-zoom-hint" aria-hidden="true"><Maximize2 /></span>
                <figcaption>
                  <span>{photo.caption || photo.alt}{photo.takenAt ? <time dateTime={photo.takenAt}>{photo.takenAt.slice(0, 10)}</time> : null}</span>
                  <span className="album-meta">{number}</span>
                </figcaption>
              </figure>
            </div>
          )
          })}
        </div>
      </BlurFade>

      {activePhoto && activeIndex !== null ? (
        <div
          className="album-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`查看图片 ${activeIndex + 1} / ${photos.length}`}
          onPointerDown={(event) => { pointerStart.current = event.clientX }}
          onPointerUp={(event) => {
            if (pointerStart.current === null) return
            const distance = event.clientX - pointerStart.current
            pointerStart.current = null
            if (Math.abs(distance) > 54) navigate(distance > 0 ? -1 : 1)
          }}
        >
          <button className="album-lightbox-backdrop" type="button" aria-label="关闭图片预览" onClick={() => setActiveIndex(null)} />
          <header>
            <div><strong>{activePhoto.caption || activePhoto.alt}</strong><span>{activePhoto.takenAt ? `${activePhoto.takenAt.replace("T", " ")} · ` : ""}{String(activeIndex + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span></div>
            <a href={activePhoto.src} target="_blank" rel="noreferrer" download><Download aria-hidden="true" /><span>原图</span></a>
            <button ref={closeButtonRef} type="button" onClick={() => setActiveIndex(null)} aria-label="关闭"><X aria-hidden="true" /></button>
          </header>
          <button className="album-lightbox-nav is-prev" type="button" onClick={() => navigate(-1)} aria-label="上一张"><ChevronLeft aria-hidden="true" /></button>
          <figure key={activePhoto.id}>
            <Image
              src={activePhoto.src}
              alt={activePhoto.alt}
              width={activePhoto.width}
              height={activePhoto.height}
              sizes="100vw"
              unoptimized={activePhoto.src.startsWith("http") || activePhoto.src.startsWith("/api/")}
              priority
            />
            <figcaption>{activePhoto.caption || activePhoto.alt}</figcaption>
          </figure>
          <button className="album-lightbox-nav is-next" type="button" onClick={() => navigate(1)} aria-label="下一张"><ChevronRight aria-hidden="true" /></button>
        </div>
      ) : null}
    </>
  )
}
