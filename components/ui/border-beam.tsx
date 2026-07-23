"use client"

import { useEffect, useRef, useState } from "react"
import { motion, MotionStyle, TargetAndTransition, Transition, useInView, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

interface BorderBeamProps {
  /**
   * The size of the border beam.
   */
  size?: number
  /**
   * The duration of the border beam.
   */
  duration?: number
  /**
   * The delay of the border beam.
   */
  delay?: number
  /**
   * The color of the border beam from.
   */
  colorFrom?: string
  /**
   * The color of the border beam to.
   */
  colorTo?: string
  /**
   * The motion transition of the border beam.
   */
  transition?: Transition
  /**
   * The class name of the border beam.
   */
  className?: string
  /**
   * The style of the border beam.
   */
  style?: React.CSSProperties
  /**
   * Whether to reverse the animation direction.
   */
  reverse?: boolean
  /**
   * The initial offset position (0-100).
   */
  initialOffset?: number
  /**
   * The border width of the beam.
   */
  borderWidth?: number
}

const mobileSafeBeamQuery = "(hover: none) and (pointer: coarse), (max-width: 767px)"

export const BorderBeam = ({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1,
}: BorderBeamProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mobileSafeBeam, setMobileSafeBeam] = useState(false)
  const inView = useInView(containerRef, { margin: "120px", amount: 0.01 })
  const reduceMotion = useReducedMotion()
  const shouldAnimate = inView && !reduceMotion
  const shouldAnimatePath = shouldAnimate && !mobileSafeBeam
  const shouldAnimateRotor = shouldAnimate && mobileSafeBeam
  const initialAngle = initialOffset * 3.6
  const mobileBeamSweep = Math.min(64, Math.max(18, size / 3))
  const mobileBeamStart = 360 - mobileBeamSweep
  const mobileBeamPeak = mobileBeamStart + mobileBeamSweep * 0.62
  const mobileAngleAnimation = {
    "--border-beam-angle": shouldAnimateRotor
      ? reverse
        ? [`${initialAngle}deg`, `${initialAngle - 360}deg`]
        : [`${initialAngle}deg`, `${initialAngle + 360}deg`]
      : `${initialAngle}deg`,
  } as TargetAndTransition

  useEffect(() => {
    const query = window.matchMedia(mobileSafeBeamQuery)
    const update = () => setMobileSafeBeam(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  return (
    <div
      ref={containerRef}
      className="border-beam-motion pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect [mask-clip:padding-box,border-box]"
      aria-hidden="true"
      style={
        {
          "--border-beam-width": `${borderWidth}px`,
        } as React.CSSProperties
      }
    >
      <motion.div
        className={cn(
          "border-beam-path absolute aspect-square",
          "bg-linear-to-l from-(--color-from) via-(--color-to) to-transparent",
          className
        )}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            "--color-from": colorFrom,
            "--color-to": colorTo,
            ...style,
          } as MotionStyle
        }
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={shouldAnimatePath ? {
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        } : { offsetDistance: `${initialOffset}%` }}
        transition={{
          repeat: shouldAnimatePath ? Infinity : 0,
          ease: "linear",
          duration,
          delay: -delay,
          ...transition,
        }}
      />
      <motion.div
        className={cn("border-beam-mobile-rotor absolute inset-0", className)}
        style={
          {
            "--border-beam-angle": `${initialAngle}deg`,
            background: `conic-gradient(from var(--border-beam-angle) at 50% 50%, transparent 0deg ${mobileBeamStart}deg, ${colorFrom} ${mobileBeamStart + mobileBeamSweep * 0.14}deg, ${colorTo} ${mobileBeamPeak}deg, transparent 360deg)`,
            ...style,
          } as MotionStyle
        }
        initial={{ "--border-beam-angle": `${initialAngle}deg` } as TargetAndTransition}
        animate={mobileAngleAnimation}
        transition={{
          repeat: shouldAnimateRotor ? Infinity : 0,
          ease: "linear",
          duration,
          delay: -delay,
          ...transition,
        }}
      />
    </div>
  )
}
