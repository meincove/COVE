// src/lib/theme.ts
export type Theme = 'light' | 'dark'

export const THEMES: Theme[] = ['light', 'dark']

export function applyTheme(theme: Theme) {
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  localStorage.setItem('theme', theme)
}

export function getStoredTheme(): Theme {
  return (localStorage.getItem('theme') as Theme) || 'light'
}
