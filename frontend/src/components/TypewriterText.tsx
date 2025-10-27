'use client'

import { useEffect, useState } from 'react'

const messages = [
  'DRIVE GERMAN . WEAR GERMAN',
  'COVE'
]

export default function TypewriterText() {
  const [index, setIndex] = useState(0)
  const [subIndex, setSubIndex] = useState(0)
  const [blinkDots, setBlinkDots] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (subIndex === messages[index].length && !isDeleting) {
      // Start blinking after word is fully typed
      const blinkInterval = setInterval(() => {
        setBlinkDots((prev) => (prev + 1) % 4)
      }, 500)

      const pauseBeforeDelete = setTimeout(() => {
        clearInterval(blinkInterval)
        setIsDeleting(true)
        setBlinkDots(0)
      }, 2500)

      return () => {
        clearTimeout(pauseBeforeDelete)
        clearInterval(blinkInterval)
      }
    }

    if (isDeleting && subIndex === 0) {
      setIsDeleting(false)
      setIndex((prev) => (prev + 1) % messages.length)
      return
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) =>
        isDeleting ? prev - 1 : prev + 1
      )
    }, isDeleting ? 30 : 80)

    return () => clearTimeout(timeout)
  }, [subIndex, isDeleting])

  return (
    <h1 className="text-3xl md:text-4xl font-semibold text-black">
      {`${messages[index].substring(0, subIndex)}${'.'.repeat(blinkDots)}`}
    </h1>
  )
}
