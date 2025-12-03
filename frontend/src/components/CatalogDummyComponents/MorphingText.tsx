'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface MorphingTextProps {
  text: string
  className?: string
}

/**
 * Per-character jump + wobble animation.
 * - No opacity fading.
 * - Each character has its own slight delay.
 * - Old text is replaced instantly; new text animates in.
 */
const charVariants = {
  hidden: (i: number) => ({
    y: 24,
    scale: 0.8,
  }),
  visible: (i: number) => ({
    y: [24, -4, 0],
    scale: [0.8, 1.05, 1],
    transition: {
      duration: 0.42,
      // stagger by index for wave-y effect; you can randomize later
      delay: 0.015 * i,
      ease: [0.22, 0.61, 0.36, 1],
    },
  }),
}

export default function MorphingText({ text, className }: MorphingTextProps) {
  // Split into characters once per text change
  const chars = useMemo(() => text.split(''), [text])

  return (
    <motion.span
      key={text} // re-trigger animation when the whole sentence changes
      className={`inline-flex flex-wrap ${className ?? ''}`}
      initial="hidden"
      animate="visible"
    >
      {chars.map((ch, i) => (
        <motion.span
          key={`${text}-${i}-${ch}`}
          variants={charVariants}
          custom={i}
          className="inline-block"
          style={{
            whiteSpace: ch === ' ' ? 'pre' : 'normal',
            // Slightly "bubbly" look – you can tweak/remove this
            textShadow:
              '0 1px 0 rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.45)',
          }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </motion.span>
      ))}
    </motion.span>
  )
}
