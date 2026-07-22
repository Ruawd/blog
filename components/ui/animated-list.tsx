"use client"

import { motion, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function AnimatedList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("magic-animated-list", className)}>{children}</div>
}

export function AnimatedListItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 12, filter: "blur(5px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      layout={!reduceMotion}
    >
      {children}
    </motion.div>
  )
}
