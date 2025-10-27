// useMousePositionInContainer.ts

import { useEffect, useState, RefObject } from 'react'

interface Position {
  x: number
  y: number
}

export function useMousePositionInContainer(containerRef: RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [isInside, setIsInside] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const localX = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
      const localY = Math.max(0, Math.min(e.clientY - rect.top, rect.height))

      setPosition({ x: localX, y: localY })
    }

    const handleEnter = () => setIsInside(true)
    const handleLeave = () => setIsInside(false)

    const node = containerRef.current
    if (node) {
      node.addEventListener('mousemove', handleMouseMove)
      node.addEventListener('mouseenter', handleEnter)
      node.addEventListener('mouseleave', handleLeave)
    }

    return () => {
      if (node) {
        node.removeEventListener('mousemove', handleMouseMove)
        node.removeEventListener('mouseenter', handleEnter)
        node.removeEventListener('mouseleave', handleLeave)
      }
    }
  }, [containerRef])

  return { position, isInside }
}
