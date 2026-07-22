"use client"

import { useState } from "react"

import { BorderBeam } from "@/components/ui/border-beam"
import { PixelImage } from "@/components/ui/pixel-image"
import { siteConfig } from "@/lib/site"

export function HomeAvatar({ name = "Ruawd", note = "文章、影像、兴趣与数字生活，都留在自己的页面里。" }: { name?: string; note?: string }) {
  const [isReady, setIsReady] = useState(false)

  return (
    <div className="home-avatar-stage" data-ready={isReady}>
      <div className="home-avatar-frame">
        <PixelImage
          className="home-avatar-only"
          src={siteConfig.avatar}
          alt="Ruawd 的头像"
          rows={6}
          columns={6}
          priority
          onReady={() => setIsReady(true)}
        />

        <BorderBeam
          size={82}
          duration={5.5}
          colorFrom="#111111"
          colorTo="#b7b7b7"
          borderWidth={1}
        />
      </div>

      <div className="home-avatar-copy">
        <p className="home-avatar-name"><span>{name}</span></p>
        <p className="home-avatar-note"><span>{note}</span></p>
      </div>
    </div>
  )
}
