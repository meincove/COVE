// 'use client'

// import { useEffect, useState } from 'react'

// export function useLocalScrollProgress(ref: React.RefObject<HTMLDivElement>, id: string) {
//   const [progress, setProgress] = useState(0)

//   useEffect(() => {
//     const updateScrollProgress = () => {
//       if (!ref.current) return
//       const rect = ref.current.getBoundingClientRect()
//       const windowHeight = window.innerHeight

//       const start = windowHeight
//       const end = -rect.height

//       const distanceScrolled = start - rect.top
//       const totalDistance = start - end
//       const rawProgress = distanceScrolled / totalDistance
//       const clampedProgress = Math.max(0, Math.min(1, rawProgress))

//       setProgress(clampedProgress)

//       console.log(`📦 Scroll for [${id}]: top=${rect.top.toFixed(1)} → progress=${clampedProgress.toFixed(2)}`)
//     }

//     window.addEventListener('scroll', updateScrollProgress)
//     updateScrollProgress()

//     return () => window.removeEventListener('scroll', updateScrollProgress)
//   }, [ref, id])

//   return progress
// }


"use client";

import { useElementScrollProgress } from "./useElementScrollProgress";

export function useLocalScrollProgress(
  ref: React.RefObject<HTMLDivElement | null>,
  containerSelector: string = ".tester-frame",
  _id?: string
) {
  return useElementScrollProgress(ref, containerSelector);
}
