"use client"

import Image from "next/image"
import { useMemo, useState, type CSSProperties } from "react"

import { cn } from "@/lib/utils"

type PixelImageProps = {
  src: string
  alt: string
  className?: string
  rows?: number
  columns?: number
  priority?: boolean
  onReady?: () => void
}

type PixelStyle = CSSProperties & {
  "--pixel-delay": string
  "--pixel-x": string
  "--pixel-y": string
  "--pixel-rotate": string
}

function createPixelStyle(index: number, rows: number, columns: number, src: string): PixelStyle {
  const row = Math.floor(index / columns)
  const column = index % columns
  const centerX = (columns - 1) / 2
  const centerY = (rows - 1) / 2
  const distance = Math.hypot(column - centerX, row - centerY)
  const maximumDistance = Math.hypot(centerX, centerY) || 1
  const directionalSeed = (index * 37 + row * 17 + column * 11) % 9
  const delay = 50 + (distance / maximumDistance) * 150 + directionalSeed * 9
  const xDirection = column < centerX ? -1 : 1
  const yDirection = row < centerY ? -1 : 1
  const backgroundX = columns === 1 ? 0 : (column / (columns - 1)) * 100
  const backgroundY = rows === 1 ? 0 : (row / (rows - 1)) * 100

  return {
    gridColumn: column + 1,
    gridRow: row + 1,
    backgroundImage: `url(${JSON.stringify(src)})`,
    backgroundPosition: `${backgroundX}% ${backgroundY}%`,
    backgroundSize: `${columns * 100}% ${rows * 100}%`,
    "--pixel-delay": `${Math.round(delay)}ms`,
    "--pixel-x": `${xDirection * (10 + directionalSeed)}px`,
    "--pixel-y": `${yDirection * (8 + (directionalSeed % 4) * 3)}px`,
    "--pixel-rotate": `${xDirection * ((directionalSeed % 3) + 1)}deg`,
  }
}

/**
 * Magic UI Pixel Image adapted for a single accessible Next.js image.
 * The browser fetches one source while deterministic grid pieces handle the reveal.
 */
export function PixelImage({
  src,
  alt,
  className,
  rows = 6,
  columns = 6,
  priority = false,
  onReady,
}: PixelImageProps) {
  const [isReady, setIsReady] = useState(false)
  const safeRows = Math.min(10, Math.max(2, Math.round(rows)))
  const safeColumns = Math.min(10, Math.max(2, Math.round(columns)))
  const pieces = useMemo(
    () => Array.from(
      { length: safeRows * safeColumns },
      (_, index) => createPixelStyle(index, safeRows, safeColumns, src),
    ),
    [safeColumns, safeRows, src],
  )

  function markReady() {
    if (isReady) return
    setIsReady(true)
    onReady?.()
  }

  return (
    <div
      className={cn("magic-pixel-image", className)}
      data-ready={isReady}
      role="img"
      aria-label={alt}
      style={{
        "--pixel-columns": safeColumns,
        "--pixel-rows": safeRows,
      } as CSSProperties}
    >
      <Image
        className="magic-pixel-source"
        src={src}
        alt=""
        fill
        priority={priority}
        sizes="(max-width: 640px) 198px, 248px"
        unoptimized
        draggable={false}
        onLoad={markReady}
        onError={markReady}
      />

      <span className="magic-pixel-grid" aria-hidden="true">
        {pieces.map((style, index) => <i style={style} key={index} />)}
      </span>
      <span className="magic-pixel-scan" aria-hidden="true" />
    </div>
  )
}
