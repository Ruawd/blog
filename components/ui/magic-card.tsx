"use client"

import type { HTMLAttributes, PointerEvent } from "react"

import { cn } from "@/lib/utils"

export function MagicCard({ className, onPointerMove, ...props }: HTMLAttributes<HTMLDivElement>) {
  function trackPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty("--magic-x", `${event.clientX - rect.left}px`)
    event.currentTarget.style.setProperty("--magic-y", `${event.clientY - rect.top}px`)
    onPointerMove?.(event)
  }

  return <div className={cn("magic-card", className)} onPointerMove={trackPointer} {...props} />
}
