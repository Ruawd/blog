"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

import { BorderBeam } from "@/components/ui/border-beam"
import { siteConfig } from "@/lib/site"

export function HomeAvatar() {
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!hasLoaded) return

    const timer = window.setTimeout(() => setIsReady(true), 420)
    return () => window.clearTimeout(timer)
  }, [hasLoaded])

  return (
    <div className="home-avatar-stage" data-ready={isReady}>
      <div className="home-avatar-frame">
        <Image
          className="home-avatar-only"
          src={siteConfig.avatar}
          alt="Ruawd 的头像"
          width={320}
          height={320}
          priority
          unoptimized
          onLoad={() => setHasLoaded(true)}
          onError={() => setHasLoaded(true)}
        />

        <div className="home-avatar-loader" role="status">
          <span className="sr-only">头像加载中</span>
          <span className="home-avatar-loader-ring" aria-hidden="true" />
        </div>

        <BorderBeam
          size={90}
          duration={8}
          colorFrom="#111111"
          colorTo="#b7b7b7"
          borderWidth={1}
        />
      </div>

      <div className="home-avatar-copy">
        <p className="home-avatar-name">Ruawd</p>
        <p className="home-avatar-note">在技术与生活之间，慢慢记录。</p>
      </div>
    </div>
  )
}
