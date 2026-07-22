import React, { type ComponentPropsWithoutRef, type CSSProperties } from "react"

import { cn } from "@/lib/utils"

interface RippleProps extends ComponentPropsWithoutRef<"div"> {
  mainCircleSize?: number
  mainCircleOpacity?: number
  numCircles?: number
}

export const Ripple = React.memo(function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  className,
  ...props
}: RippleProps) {
  return (
    <div className={cn("magic-ripple", className)} aria-hidden="true" {...props}>
      {Array.from({ length: numCircles }, (_, index) => {
        const size = mainCircleSize + index * 70
        return (
          <span
            className="magic-ripple-circle"
            key={index}
            style={{
              "--ripple-index": index,
              width: size,
              height: size,
              opacity: Math.max(mainCircleOpacity - index * 0.018, 0.02),
            } as CSSProperties}
          />
        )
      })}
    </div>
  )
})

Ripple.displayName = "Ripple"
