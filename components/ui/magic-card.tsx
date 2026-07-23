"use client"

import { useEffect, useRef, type HTMLAttributes, type PointerEvent } from "react"

import { cn } from "@/lib/utils"

export function MagicCard({ className, onPointerMove, ...props }: HTMLAttributes<HTMLDivElement>) {
  const finePointerRef = useRef(false)
  const frameRef = useRef<number | null>(null)
  const latestPointerRef = useRef<{
    element: HTMLDivElement
    clientX: number
    clientY: number
  } | null>(null)

  useEffect(() => {
    const query = window.matchMedia("(any-pointer: fine)")
    const update = () => {
      finePointerRef.current = query.matches
    }

    update()
    query.addEventListener("change", update)

    return () => {
      query.removeEventListener("change", update)
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    }
  }, [])

  function trackPointer(event: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event)

    if (event.pointerType !== "mouse" || !finePointerRef.current) return

    latestPointerRef.current = {
      element: event.currentTarget,
      clientX: event.clientX,
      clientY: event.clientY,
    }

    if (frameRef.current !== null) return

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null
      const pointer = latestPointerRef.current
      if (!pointer) return

      const rect = pointer.element.getBoundingClientRect()
      pointer.element.style.setProperty("--magic-x", `${pointer.clientX - rect.left}px`)
      pointer.element.style.setProperty("--magic-y", `${pointer.clientY - rect.top}px`)
    })
  }

  return <div className={cn("magic-card", className)} onPointerMove={trackPointer} {...props} />
}
