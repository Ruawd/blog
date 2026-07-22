"use client"

import React, { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

/**
 * InteractiveGridPattern is a component that renders a grid pattern with interactive squares.
 *
 * @param width - The width of each square.
 * @param height - The height of each square.
 * @param squares - The number of squares in the grid. The first element is the number of horizontal squares, and the second element is the number of vertical squares.
 * @param className - The class name of the grid.
 * @param squaresClassName - The class name of the squares.
 */
interface InteractiveGridPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number
  height?: number
  squares?: [number, number] // [horizontal, vertical]
  className?: string
  squaresClassName?: string
}

/**
 * The InteractiveGridPattern component.
 *
 * @see InteractiveGridPatternProps for the props interface.
 * @returns A React component.
 */
export function InteractiveGridPattern({
  width = 40,
  height = 40,
  squares = [24, 24],
  className,
  squaresClassName,
  style,
  ...props
}: InteractiveGridPatternProps) {
  const [horizontal, vertical] = squares
  const [hoveredSquare, setHoveredSquare] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const pointerPositionRef = useRef({ x: 0, y: 0 })
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const updateHoveredSquare = () => {
      animationFrameRef.current = null
      const svg = svgRef.current
      const matrix = svg?.getScreenCTM()

      if (!svg || !matrix) {
        setHoveredSquare(null)
        return
      }

      try {
        const point = svg.createSVGPoint()
        point.x = pointerPositionRef.current.x
        point.y = pointerPositionRef.current.y
        const localPoint = point.matrixTransform(matrix.inverse())
        const column = Math.floor(localPoint.x / width)
        const row = Math.floor(localPoint.y / height)
        const isInside = column >= 0 && column < horizontal && row >= 0 && row < vertical
        const nextSquare = isInside ? row * horizontal + column : null

        setHoveredSquare((currentSquare) => currentSquare === nextSquare ? currentSquare : nextSquare)
      } catch {
        setHoveredSquare(null)
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return

      pointerPositionRef.current = { x: event.clientX, y: event.clientY }
      if (animationFrameRef.current === null) {
        animationFrameRef.current = window.requestAnimationFrame(updateHoveredSquare)
      }
    }

    const clearHoveredSquare = (event: PointerEvent) => {
      if (event.relatedTarget === null) setHoveredSquare(null)
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerout", clearHoveredSquare)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerout", clearHoveredSquare)
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [height, horizontal, vertical, width])

  return (
    <svg
      ref={svgRef}
      width={width * horizontal}
      height={height * vertical}
      viewBox={`0 0 ${width * horizontal} ${height * vertical}`}
      preserveAspectRatio="xMidYMid slice"
      className={cn(
        "absolute inset-0 h-full w-full border border-gray-400/30",
        className
      )}
      style={{ pointerEvents: "none", ...style }}
      {...props}
    >
      {Array.from({ length: horizontal * vertical }).map((_, index) => {
        const x = (index % horizontal) * width
        const y = Math.floor(index / horizontal) * height
        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={width}
            height={height}
            className={cn(
              "interactive-grid-cell",
              squaresClassName
            )}
            data-active={hoveredSquare === index}
          />
        )
      })}
    </svg>
  )
}
