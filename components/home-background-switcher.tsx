"use client"

import { useState } from "react"

import { Meteors } from "@/components/ui/meteors"
import { Particles } from "@/components/ui/particles"
import { Ripple } from "@/components/ui/ripple"

const options = [
  { id: "soft", label: "柔光" },
  { id: "particles", label: "粒子" },
  { id: "meteors", label: "流星" },
  { id: "ripple", label: "波纹" },
] as const

type BackgroundStyle = (typeof options)[number]["id"]

export function HomeBackgroundSwitcher() {
  const [style, setStyle] = useState<BackgroundStyle>("soft")

  return (
    <div className="home-background" data-background={style}>
      <div className="home-background-layer home-soft-light" aria-hidden="true" />
      {style === "particles" ? (
        <Particles
          className="home-background-layer"
          quantity={82}
          color="#111111"
          ease={72}
          staticity={58}
        />
      ) : null}
      {style === "meteors" ? (
        <div className="home-background-layer home-meteor-field" aria-hidden="true">
          <Meteors number={24} minDuration={4} maxDuration={10} className="home-meteor" />
        </div>
      ) : null}
      {style === "ripple" ? (
        <Ripple className="home-ripple" mainCircleOpacity={0.16} numCircles={9} />
      ) : null}

      <div className="background-picker" role="group" aria-label="主页背景风格预览">
        <span>背景</span>
        {options.map((option) => (
          <button
            type="button"
            key={option.id}
            aria-pressed={style === option.id}
            onClick={() => setStyle(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
