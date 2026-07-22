"use client"

import { useEffect, useRef } from "react"
import { animate, useInView, useReducedMotion } from "motion/react"

export function NumberTicker({
  value,
  decimals = 0,
  suffix = "",
  className,
}: {
  value: number
  decimals?: number
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "80px" })
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const element = ref.current
    if (!element || !inView) return
    if (reduceMotion) {
      element.textContent = `${value.toFixed(decimals)}${suffix}`
      return
    }
    const controls = animate(0, value, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        element.textContent = `${latest.toFixed(decimals)}${suffix}`
      },
    })
    return () => controls.stop()
  }, [decimals, inView, reduceMotion, suffix, value])

  return <span ref={ref} className={className} aria-label={`${value.toFixed(decimals)}${suffix}`}>{value.toFixed(decimals)}{suffix}</span>
}
