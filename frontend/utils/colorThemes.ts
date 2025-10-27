// utils/colorThemes.ts

export interface ColorTheme {
  gradient: string         // Tailwind gradient
  textColor: string        // Tailwind text color
  bgAnimationClass: string // Custom animation class from globals.css
}

export const colorThemes: Record<string, ColorTheme> = {
  forest: {
    gradient: 'from-green-500 via-emerald-600 to-lime-500',
    textColor: 'text-green-100',
    bgAnimationClass: 'animate-gradient-wave-forest',
  },
  cosmic: {
    gradient: 'from-gray-900 via-gray-700 to-black',
    textColor: 'text-gray-300',
    bgAnimationClass: 'animate-gradient-wave-dark',
  },
  ocean: {
    gradient: 'from-blue-500 via-cyan-600 to-indigo-700',
    textColor: 'text-blue-100',
    bgAnimationClass: 'animate-gradient-wave-ocean',
  },
  lunar: {
    gradient: 'from-white via-gray-200 to-gray-400',
    textColor: 'text-gray-800',
    bgAnimationClass: 'animate-gradient-wave-lunar',
  },
  rose: {
    gradient: 'from-pink-400 via-rose-500 to-fuchsia-500',
    textColor: 'text-pink-100',
    bgAnimationClass: 'animate-gradient-wave-rose',
  },
  sand: {
    gradient: 'from-yellow-100 via-amber-200 to-orange-100',
    textColor: 'text-yellow-800',
    bgAnimationClass: 'animate-gradient-wave-lunar',
  },
  mint: {
    gradient: 'from-emerald-200 via-teal-300 to-emerald-400',
    textColor: 'text-emerald-900',
    bgAnimationClass: 'animate-gradient-wave-forest',
  }
}

export const colorNameToThemeKey: Record<string, keyof typeof colorThemes> = {
  green: 'forest',
  black: 'cosmic',
  blue: 'ocean',
  white: 'lunar',
  pink: 'rose',
  
    // New additions:
  cream: 'sand',          // #f6ddcc
  ghostgreen: 'mint',     // #278c72
  nightOrange: 'sand',    // #dcc693
  shadeLime: 'mint',      // #98deb4
  hotpink: 'rose',        // #d0b7bd
}
