'use client'

import { useEffect, useRef, useState } from 'react'

type PlatformParticlesProps = {
    className?: string
}

// tiny utility so we don’t depend on clsx
const cn = (...classes: (string | false | null | undefined)[]) =>
    classes.filter(Boolean).join(' ')

declare global {
    interface Window {
        particlesJS?: (id: string, config: any) => void
    }
}

const PARTICLES_CONFIG = {
    particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: '#ffffff' },
        shape: { type: 'circle' },
        opacity: { value: 0.4, random: false },
        size: { value: 3, random: true },
        line_linked: {
            enable: true,
            distance: 150,
            color: '#ffffff',
            opacity: 0.4,
            width: 1,
        },
        move: {
            enable: true,
            speed: 3.5, // a bit calmer than default 6
            direction: 'none',
            random: false,
            straight: false,
            out_mode: 'out',
            bounce: false,
        },
    },
    interactivity: {
        detect_on: 'canvas',
        events: {
            onhover: { enable: true, mode: 'repulse' },
            onclick: { enable: false, mode: 'push' }, // we don't need click here
            resize: true,
        },
        modes: {
            repulse: { distance: 150, duration: 0.4 },
        },
    },
    retina_detect: true,
}

export default function PlatformParticles({ className }: PlatformParticlesProps) {
    const containerId = 'platform-particles'
    const scriptLoadedRef = useRef(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted || typeof window === 'undefined') return

        const initParticles = () => {
            const el = document.getElementById(containerId)
            if (!el) {
                console.error('Platform particles container not found')
                return
            }

            if (!window.particlesJS) {
                console.error('particlesJS not loaded')
                return
            }

            console.log('Initializing particles.js on', containerId)
            window.particlesJS(containerId, PARTICLES_CONFIG)
        }

        if (scriptLoadedRef.current) {
            // Script already loaded, just init
            setTimeout(initParticles, 100) // Small delay to ensure DOM is ready
            return
        }

        // Load script
        const existingScript = document.querySelector('script[src*="particles.js"]')
        if (existingScript) {
            scriptLoadedRef.current = true
            setTimeout(initParticles, 100)
            return
        }

        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js'
        script.async = true
        script.onload = () => {
            console.log('Particles.js script loaded')
            scriptLoadedRef.current = true
            setTimeout(initParticles, 100)
        }
        script.onerror = () => {
            console.error('Failed to load particles.js')
        }
        document.body.appendChild(script)

        return () => {
            const el = document.getElementById(containerId)
            if (el) el.innerHTML = ''
        }
    }, [mounted])

    if (!mounted) return null

    return (
        <div
            id={containerId}
            className={cn(
                // IMPORTANT: this must sit **above** the gradient, not under it
                'absolute inset-0 z-10 pointer-events-none',
                className
            )}
        />
    )
}
