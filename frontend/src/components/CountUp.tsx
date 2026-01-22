"use client"

import { useEffect, useState, useRef } from "react"

interface CountUpProps {
    end: number
    suffix?: string
    duration?: number
    className?: string
}

export default function CountUp({
    end,
    suffix = "",
    duration = 2000,
    className = ""
}: CountUpProps) {
    const [count, setCount] = useState(0)
    const [hasStarted, setHasStarted] = useState(false)
    const ref = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !hasStarted) {
                    setHasStarted(true)
                }
            },
            { threshold: 0.5 }
        )

        if (ref.current) {
            observer.observe(ref.current)
        }

        return () => observer.disconnect()
    }, [hasStarted])

    useEffect(() => {
        if (!hasStarted) return

        const startTime = Date.now()
        const startValue = 0

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)

            // Easing function for smooth deceleration
            const easeOutQuart = 1 - Math.pow(1 - progress, 4)

            const currentValue = Math.floor(startValue + (end - startValue) * easeOutQuart)
            setCount(currentValue)

            if (progress < 1) {
                requestAnimationFrame(animate)
            }
        }

        requestAnimationFrame(animate)
    }, [hasStarted, end, duration])

    return (
        <span ref={ref} className={className}>
            {count.toLocaleString()}{suffix}
        </span>
    )
}
