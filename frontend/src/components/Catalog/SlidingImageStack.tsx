// src/components/Catalog/SlidingImageStack.tsx
'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'

interface SlidingImageStackProps {
  images: string[]
  name: string
  isActive: boolean
  showArrows: boolean
  onImageChange?: () => void
}

export default function SlidingImageStack({
  images,
  name,
  isActive,
  showArrows,
  onImageChange,
}: SlidingImageStackProps) {
  const stackRef = useRef<HTMLDivElement | null>(null)
  const cardsRef = useRef<HTMLDivElement[]>([])
  //   const advanceRef = useRef<((dir: 1 | -1) => void) | null>(null)

  // which image is currently in front (0 = first image)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const stack = stackRef.current
    if (!stack) return

    cardsRef.current = Array.from(
      stack.querySelectorAll<HTMLDivElement>('.image-card')
    )

    if (!cardsRef.current.length) return

    let isSwiping = false
    let startX = 0
    let currentX = 0
    let frameId: number | null = null

    const getDuration = () => 300

    const getActiveCard = () => {
      const cards = cardsRef.current
      if (!cards.length) return null
      return cards[activeIndex] ?? cards[0]
    }

    const updatePositions = () => {
      const cards = cardsRef.current
      const n = cards.length
      if (!n) return

      cards.forEach((card, i) => {
        if (!card) return

        // relative position to the active card
        let rel = i - activeIndex
        if (rel < 0) rel += n

        const offset = rel + 1
        const isFront = rel === 0

        card.style.zIndex = String(200 - offset)
        card.style.opacity = isFront ? '1' : '0.95'
        card.style.transform = `perspective(700px)
      translateZ(${-12 * offset}px)
      translateY(${7 * offset}px)
      translateX(0px)
      rotateY(0deg)`
        card.style.transition =
          'transform 220ms ease-out, opacity 220ms ease-out'
      })
    }


    // const getDuration = () => 300
    // const getActiveCard = () => cardsRef.current[0]

    // const updatePositions = () => {
    //   cardsRef.current.forEach((card, i) => {
    //     const offset = i + 1
    //     card.style.zIndex = String(100 - offset)
    //     card.style.opacity = '1'
    //     card.style.transform = `perspective(700px)
    //       translateZ(${-12 * offset}px)
    //       translateY(${7 * offset}px)
    //       translateX(0px)
    //       rotateY(0deg)`
    //     card.style.transition =
    //       'transform 220ms ease-out, opacity 220ms ease-out'
    //   })
    // }

    const applySwipeStyles = (deltaX: number) => {
      const card = getActiveCard()
      if (!card) return
      const rotate = deltaX * 0.2
      const opacity = 1 - Math.min(Math.abs(deltaX) / 100, 1) * 0.75
      card.style.transform = `perspective(700px)
        translateZ(-12px)
        translateY(7px)
        translateX(${deltaX}px)
        rotateY(${rotate}deg)`
      card.style.opacity = `${opacity}`
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (!isActive) return
      isSwiping = true
      startX = currentX = e.clientX
      const card = getActiveCard()
      if (card) card.style.transition = 'none'

      // 👇 ensure we ALWAYS get pointerup, even if cursor leaves the div
      stackRef.current?.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isSwiping) return
      if (frameId) cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        currentX = e.clientX
        const deltaX = currentX - startX
        applySwipeStyles(deltaX)
        // optional: trigger auto-complete if you drag far enough
        if (Math.abs(deltaX) > 50) {
          finishSwipe(deltaX)
        }
      })
    }

    const finishSwipe = (deltaX: number) => {
      const threshold = 50
      const duration = getDuration()
      const card = getActiveCard()
      if (!card) return

      card.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`

      if (Math.abs(deltaX) > threshold) {
        // swipe left => move card left, go to NEXT image
        // swipe right => move card right, go to PREVIOUS image
        const direction: 1 | -1 = deltaX < 0 ? -1 : 1

        card.style.transform = `perspective(700px)
      translateZ(-12px)
      translateY(7px)
      translateX(${direction * 300}px)
      rotateY(${direction * 20}deg)`

        setTimeout(() => {
          const n = cardsRef.current.length
          if (!n) return

          setActiveIndex((prev) => {
            let next: number
            if (direction === -1) {
              // dragged left → show next image
              next = (prev + 1) % n
            } else {
              // dragged right → show previous image
              next = (prev - 1 + n) % n
            }
            onImageChange?.()
            return next
          })
        }, duration)
      } else {
        // snap back to center if below threshold
        applySwipeStyles(0)
        setTimeout(updatePositions, duration)
      }
    }




    // const finishSwipe = (deltaX: number) => {
    //   const threshold = 50
    //   const duration = getDuration()
    //   const card = getActiveCard()
    //   if (!card) return

    //   card.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`

    //   if (Math.abs(deltaX) > threshold) {
    //     const direction = Math.sign(deltaX) || 1
    //     card.style.transform = `perspective(700px)
    //       translateZ(-12px)
    //       translateY(7px)
    //       translateX(${direction * 300}px)
    //       rotateY(${direction * 20}deg)`

    //     setTimeout(() => {
    //       cardsRef.current = [...cardsRef.current.slice(1), card]
    //       updatePositions()
    //       onImageChange?.()
    //     }, duration)
    //   } else {
    //     // snap back to center if below threshold
    //     applySwipeStyles(0)
    //     setTimeout(updatePositions, duration)
    //   }
    // }

    const handlePointerUp = (e: PointerEvent) => {
      if (!isSwiping) return
      if (frameId) cancelAnimationFrame(frameId)
      const deltaX = currentX - startX
      finishSwipe(deltaX)
      isSwiping = false
      startX = currentX = 0

      // 👇 release capture so cursor returns to normal
      stackRef.current?.releasePointerCapture(e.pointerId)
    }

    stack.addEventListener('pointerdown', handlePointerDown)
    stack.addEventListener('pointermove', handlePointerMove)
    stack.addEventListener('pointerup', handlePointerUp)
    stack.addEventListener('pointerleave', handlePointerUp)

    updatePositions()



    return () => {
      if (frameId) cancelAnimationFrame(frameId)
      stack.removeEventListener('pointerdown', handlePointerDown)
      stack.removeEventListener('pointermove', handlePointerMove)
      stack.removeEventListener('pointerup', handlePointerUp)
      stack.removeEventListener('pointerleave', handlePointerUp)
    }
  }, [images.length, isActive, onImageChange, activeIndex])

  const handleWrapperPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // just to avoid text/image selection glitches
    e.preventDefault()
    e.stopPropagation()
  }



  return (
    <>
      {/* STACK AREA */}
      <div
        ref={stackRef}
        onPointerDown={handleWrapperPointerDown}
        className="
          relative w-[90%] h-full mx-auto
          grid place-content-center
          touch-none select-none
          cursor-grab active:cursor-grabbing
        "
      >
        {images.map((img, idx) => (
          <article
            key={img}
            className="image-card absolute inset-0 rounded-[28px] "
          >
            <Image
              src={img}
              alt={`Image ${idx + 1}`}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 26vw, 80vw"
              unoptimized={true}
            />
          </article>
        ))}
      </div>
    </>
  )
}
