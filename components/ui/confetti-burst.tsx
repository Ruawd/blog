"use client"

import type { CSSProperties } from "react"

type ConfettiStyle = CSSProperties & {
  "--confetti-x": string
  "--confetti-y": string
  "--confetti-r": string
  "--confetti-delay": string
}

export function ConfettiBurst({ burstKey }: { burstKey: number }) {
  if (!burstKey) return null
  return (
    <div className="magic-confetti" aria-hidden="true" key={burstKey}>
      {Array.from({ length: 22 }, (_, index) => {
        const angle = (index / 22) * Math.PI * 2
        const distance = 120 + (index % 5) * 22
        const style: ConfettiStyle = {
          "--confetti-x": `${Math.cos(angle) * distance}px`,
          "--confetti-y": `${Math.sin(angle) * distance - 70}px`,
          "--confetti-r": `${(index * 47) % 280}deg`,
          "--confetti-delay": `${(index % 4) * 18}ms`,
        }
        return <i style={style} data-shape={index % 3} key={index} />
      })}
    </div>
  )
}
