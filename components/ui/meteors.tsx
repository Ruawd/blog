import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

type MeteorsProps = {
  number?: number
  minDelay?: number
  maxDelay?: number
  minDuration?: number
  maxDuration?: number
  angle?: number
  className?: string
}

export function Meteors({
  number = 20,
  minDelay = 0.2,
  maxDelay = 1.2,
  minDuration = 2,
  maxDuration = 10,
  angle = 215,
  className,
}: MeteorsProps) {
  const random = (index: number, salt: number) => {
    const value = Math.sin((index + 1) * 9176.13 + salt * 101.7) * 43758.5453
    return value - Math.floor(value)
  }
  const styles = Array.from({ length: number }, (_, index) => ({
    "--meteor-angle": `${-angle}deg`,
    left: `${random(index, 1) * 100}%`,
    animationDelay: `${random(index, 2) * (maxDelay - minDelay) + minDelay}s`,
    animationDuration: `${random(index, 3) * (maxDuration - minDuration) + minDuration}s`,
  }) as CSSProperties)

  return styles.map((style, index) => (
    <span className={cn("magic-meteor", className)} key={index} style={style}>
      <span />
    </span>
  ))
}
