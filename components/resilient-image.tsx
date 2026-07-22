"use client"

import { useState, type ImgHTMLAttributes } from "react"

type ResilientImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string
  fallbackSrc?: string
}

export function ResilientImage({
  src,
  fallbackSrc = "/blog-media/image-unavailable.svg",
  alt,
  onError,
  ...props
}: ResilientImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const resolvedSrc = failedSrc === src ? fallbackSrc : src

  return (
    // Remote article media has no stable dimensions at build time.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={resolvedSrc}
      alt={alt ?? "文章配图"}
      onError={(event) => {
        onError?.(event)
        if (resolvedSrc !== fallbackSrc) setFailedSrc(src)
      }}
    />
  )
}
