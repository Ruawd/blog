"use client"

import { useEffect, useState } from "react"
import { useReducedMotion } from "motion/react"

import { BorderBeam } from "@/components/ui/border-beam"
import { PixelImage } from "@/components/ui/pixel-image"
import { TextAnimate } from "@/components/ui/text-animate"
import { siteConfig } from "@/lib/site"

const pixelRevealDurationMs = 3_100

export function HomeAvatar({ name = "Ruawd", note = "文章、影像、兴趣与数字生活，都留在自己的页面里。" }: { name?: string; note?: string }) {
  const [imageReady, setImageReady] = useState(false)
  const [copyReady, setCopyReady] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!imageReady) return
    const timer = window.setTimeout(
      () => setCopyReady(true),
      reduceMotion ? 0 : pixelRevealDurationMs,
    )
    return () => window.clearTimeout(timer)
  }, [imageReady, reduceMotion])

  return (
    <div className="home-avatar-stage" data-ready={imageReady} data-copy-ready={copyReady}>
      <div className="home-avatar-frame">
        <PixelImage
          className="home-avatar-only"
          src={siteConfig.avatar}
          alt="Ruawd 的头像"
          rows={6}
          columns={6}
          priority
          onReady={() => setImageReady(true)}
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
        {reduceMotion ? (
          <>
            <p className="home-avatar-name">{name}</p>
            <p className="home-avatar-note">{note}</p>
          </>
        ) : (
          <>
            <TextAnimate
              as="p"
              className="home-avatar-name"
              by="text"
              animation="blurInUp"
              startOnView={false}
              animate={copyReady ? "show" : "hidden"}
            >
              {name}
            </TextAnimate>
            <TextAnimate
              as="p"
              className="home-avatar-note"
              by="character"
              animation="blurInUp"
              delay={0.16}
              duration={0.72}
              startOnView={false}
              animate={copyReady ? "show" : "hidden"}
            >
              {note}
            </TextAnimate>
          </>
        )}
      </div>
    </div>
  )
}
