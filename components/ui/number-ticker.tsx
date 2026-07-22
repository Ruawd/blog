"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { animate, useInView, useReducedMotion } from "motion/react"

export function NumberTicker({
  value,
  decimals = 0,
  suffix = "",
  className,
  notation,
}: {
  value: number
  decimals?: number
  suffix?: string
  className?: string
  notation?: "standard" | "compact"
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "80px" })
  const reduceMotion = useReducedMotion()
  const formatter = useMemo(() => notation ? new Intl.NumberFormat("zh-CN", {
    notation,
    maximumFractionDigits: decimals,
  }) : null, [decimals, notation])
  const formatValue = useCallback(
    (current: number) => `${formatter ? formatter.format(current) : current.toFixed(decimals)}${suffix}`,
    [decimals, formatter, suffix],
  )

  useEffect(() => {
    const element = ref.current
    if (!element || !inView) return
    if (reduceMotion) {
      element.textContent = formatValue(value)
      return
    }
    const controls = animate(0, value, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        element.textContent = formatValue(latest)
      },
    })
    return () => controls.stop()
  }, [formatValue, inView, reduceMotion, value])

  const formattedValue = formatValue(value)
  return <span ref={ref} className={className} aria-label={formattedValue}>{formattedValue}</span>
}
