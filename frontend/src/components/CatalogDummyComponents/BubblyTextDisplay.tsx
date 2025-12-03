'use client'

import React from 'react'
import { AnimatePresence } from 'framer-motion'
import BubblyCharacter from './BubblyCharacter'

interface BubblyTextDisplayProps {
  text: string
  theme?: 'pink' | 'blue' | 'purple' | 'mix'
}

const themes = {
  pink: 'text-pink-400',
  blue: 'text-cyan-400',
  purple: 'text-purple-400',
  mix: 'text-white',
} as const

const BubblyTextDisplay: React.FC<BubblyTextDisplayProps> = ({
  text,
  theme = 'mix',
}) => {
  const characters = text.split('')

  const getColor = (index: number) => {
    if (theme !== 'mix') return themes[theme]
    const colors = [
      'text-pink-400',
      'text-cyan-400',
      'text-purple-400',
      'text-yellow-400',
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="flex flex-wrap items-center">
      <AnimatePresence mode="popLayout" initial={false}>
        {characters.map((char, index) => (
          // key includes index + char so changes trigger exit/enter
          <BubblyCharacter
            key={`${index}-${char}`}
            char={char}
            index={index}
            colorTheme={getColor(index)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export default BubblyTextDisplay
