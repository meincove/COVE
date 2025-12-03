'use client'

import React, { useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'

interface BubblyCharacterProps {
  char: string
  index: number
  colorTheme: string // Tailwind text color class
}

const BubblyCharacter: React.FC<BubblyCharacterProps> = ({
  char,
  index,
  colorTheme,
}) => {
  // predictable but organic delay based on index
  const randomDelay = useMemo(() => (index % 5) * 0.05, [index])

  // keep spaces visible
  const displayChar = char === ' ' ? '\u00A0' : char

  const variants: Variants = {
    initial: {
      opacity: 0,
      scale: 0,
      y: 50,
      rotate: Math.random() * 40 - 20, // -20° to 20°
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 15,
        mass: 1,
        delay: randomDelay,
      },
    },
    exit: {
      opacity: 0,
      scale: 0,
      y: -50,
      rotate: Math.random() * 40 - 20,
      transition: {
        duration: 0.2,
        ease: 'backIn',
      },
    },
  }

  return (
    <motion.span
      layout
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`inline-block text-4xl md:text-6xl font-black ${colorTheme} select-none mx-[1px]`}
      style={{
        // 3D / bubbly feel
        textShadow:
          '0px 8px 0px rgba(0,0,0,0.25), 0px 15px 10px rgba(0,0,0,0.15)',
        WebkitTextStroke: '2px rgba(255,255,255,0.1)',
      }}
    >
      {displayChar}
    </motion.span>
  )
}

export default React.memo(BubblyCharacter)
