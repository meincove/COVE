'use client'

import { useState, useEffect, useRef } from 'react'

interface OwlCharacterModalProps {
    mousePosition: { x: number; y: number }
    validationState?: 'correct' | 'wrong' | 'idle'
}

export default function OwlCharacterModal({
    mousePosition,
    validationState = 'idle',
}: OwlCharacterModalProps) {
    const owlRef = useRef<HTMLDivElement>(null)

    // Visual states
    const [isSleeping, setIsSleeping] = useState(false)
    const [isFlapping, setIsFlapping] = useState(false)
    const [message, setMessage] = useState('')
    const [showMessage, setShowMessage] = useState(false)
    const [eyesOpen, setEyesOpen] = useState(true)
    const [eyebrowRaise, setEyebrowRaise] = useState(0)

    // Refs for tracking
    const lastMouseMoveTime = useRef(Date.now())
    const sleepCheckInterval = useRef<NodeJS.Timeout | null>(null)

    // Update last mouse move time whenever mouse moves
    useEffect(() => {
        lastMouseMoveTime.current = Date.now()

        // Wake up if sleeping
        if (isSleeping) {
            setIsSleeping(false)
            setEyesOpen(true)
            setMessage('')
            setShowMessage(false)
        }
    }, [mousePosition.x, mousePosition.y])

    // Sleep detection
    useEffect(() => {
        if (sleepCheckInterval.current) {
            clearInterval(sleepCheckInterval.current)
        }

        sleepCheckInterval.current = setInterval(() => {
            const now = Date.now()
            const timeSinceMove = now - lastMouseMoveTime.current
            const shouldSleep = timeSinceMove >= 8000 && validationState === 'idle' && !isSleeping

            if (shouldSleep) {
                setIsSleeping(true)
                setEyesOpen(false)
                setMessage("Waiting for you...")
                setShowMessage(true)
            }
        }, 1000)

        return () => {
            if (sleepCheckInterval.current) {
                clearInterval(sleepCheckInterval.current)
            }
        }
    }, [validationState, isSleeping])

    // Handle validation state changes
    useEffect(() => {
        if (validationState === 'wrong') {
            setIsSleeping(false)
            setEyesOpen(true)
            setIsFlapping(true)
            setMessage("Try again!")
            setShowMessage(true)
            setEyebrowRaise(-10)

            setTimeout(() => setIsFlapping(false), 500)
            setTimeout(() => {
                setShowMessage(false)
                setEyebrowRaise(0)
            }, 2500)

        } else if (validationState === 'correct') {
            setIsSleeping(false)
            setEyesOpen(true)
            setMessage("Perfect! ✓")
            setShowMessage(true)
            setEyebrowRaise(12)
            setIsFlapping(false)

            setTimeout(() => {
                setShowMessage(false)
                setEyebrowRaise(0)
            }, 2500)
        }
    }, [validationState])

    // Calculate head rotation and eye position (±25° head tilt)
    const getHeadAndEyePosition = () => {
        if (!owlRef.current || isSleeping) return { headRotation: 0, eyeX: 0, eyeY: 0 }

        const rect = owlRef.current.getBoundingClientRect()
        const owlCenterX = rect.left + rect.width / 2
        const owlCenterY = rect.top + rect.height / 2

        const deltaX = mousePosition.x - owlCenterX
        const deltaY = mousePosition.y - owlCenterY
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        const normalizedDistance = Math.min(distance / 400, 1)

        // Head rotation: ±25° based on horizontal mouse position
        const headRotation = (deltaX / 300) * 25
        const clampedHeadRotation = Math.max(-25, Math.min(25, headRotation))

        // Eye position within socket
        const angle = Math.atan2(deltaY, deltaX)
        const eyeX = Math.cos(angle) * normalizedDistance * 6
        const eyeY = Math.sin(angle) * normalizedDistance * 6

        return {
            headRotation: clampedHeadRotation,
            eyeX,
            eyeY
        }
    }

    const { headRotation, eyeX, eyeY } = getHeadAndEyePosition()

    return (
        <div ref={owlRef} className="relative flex flex-col items-center justify-center">
            {/* Speech Bubble */}
            {showMessage && message && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full z-10 animate-fade-in-scale">
                    <div className="relative bg-white px-4 py-2 rounded-xl shadow-lg border border-gray-100">
                        <p className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                            {message}
                        </p>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-white" />
                        </div>
                    </div>
                </div>
            )}

            {/* Owl Container - Modal version (smaller, perched) */}
            <div
                className="relative w-32 h-36 transition-transform duration-150 ease-out"
                style={{ transform: `rotate(${headRotation}deg)` }}
            >
                {/* Head */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-28 h-28 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full shadow-xl" />

                {/* Ear Tufts */}
                <div className="absolute top-0 left-6 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[20px] border-b-amber-700 transform -rotate-12" />
                <div className="absolute top-0 right-6 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[20px] border-b-amber-700 transform rotate-12" />

                {/* Face */}
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-22 h-22 bg-amber-50 rounded-full" style={{ width: '5.5rem', height: '5.5rem' }} />

                {/* Eyebrows */}
                <div
                    className="absolute top-9 left-9 w-7 h-1.5 bg-amber-900 rounded-full transition-all duration-300"
                    style={{ transform: `rotate(${eyebrowRaise}deg)` }}
                />
                <div
                    className="absolute top-9 right-9 w-7 h-1.5 bg-amber-900 rounded-full transition-all duration-300"
                    style={{ transform: `rotate(${-eyebrowRaise}deg)` }}
                />

                {/* Eyes */}
                {eyesOpen ? (
                    <div className="absolute top-11 left-1/2 transform -translate-x-1/2 flex gap-2">
                        {/* Left Eye */}
                        <div className="relative w-9 h-10 bg-white rounded-full shadow-inner border-2 border-amber-900">
                            <div
                                className="absolute top-1/2 left-1/2 w-6 h-6 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full transition-transform duration-100 ease-out"
                                style={{ transform: `translate(calc(-50% + ${eyeX}px), calc(-50% + ${eyeY}px))` }}
                            >
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-black rounded-full">
                                    <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full" />
                                </div>
                            </div>
                        </div>

                        {/* Right Eye */}
                        <div className="relative w-9 h-10 bg-white rounded-full shadow-inner border-2 border-amber-900">
                            <div
                                className="absolute top-1/2 left-1/2 w-6 h-6 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full transition-transform duration-100 ease-out"
                                style={{ transform: `translate(calc(-50% + ${eyeX}px), calc(-50% + ${eyeY}px))` }}
                            >
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-black rounded-full">
                                    <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="absolute top-14 left-1/2 transform -translate-x-1/2 flex gap-2">
                        <div className="w-8 h-0.5 bg-amber-900 rounded-full" />
                        <div className="w-8 h-0.5 bg-amber-900 rounded-full" />
                    </div>
                )}

                {/* Sleeping Z's */}
                {isSleeping && (
                    <div className="absolute -top-1 -right-2 text-lg font-bold text-gray-400 animate-pulse">
                        z z
                    </div>
                )}

                {/* Beak */}
                <div className="absolute top-[5.5rem] left-1/2 transform -translate-x-1/2">
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-orange-500" />
                </div>

                {/* Body */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-20 h-10 bg-gradient-to-b from-amber-700 to-amber-900 rounded-[50%] shadow-md" />

                {/* Belly */}
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-12 h-6 bg-amber-100 rounded-[50%]" />

                {/* Wings */}
                <div
                    className={`absolute top-[4.5rem] -left-1 w-8 h-10 bg-amber-800 rounded-[50%] shadow transition-transform duration-150 ${isFlapping ? 'animate-flap-left' : 'transform -rotate-12'
                        }`}
                />
                <div
                    className={`absolute top-[4.5rem] -right-1 w-8 h-10 bg-amber-800 rounded-[50%] shadow transition-transform duration-150 ${isFlapping ? 'animate-flap-right' : 'transform rotate-12'
                        }`}
                />

                {/* Feet */}
                <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 flex gap-1.5">
                    <div className="flex gap-0.5">
                        <div className="w-0.5 h-2 bg-orange-600 rounded-full" />
                        <div className="w-0.5 h-2 bg-orange-600 rounded-full" />
                        <div className="w-0.5 h-2 bg-orange-600 rounded-full" />
                    </div>
                    <div className="flex gap-0.5">
                        <div className="w-0.5 h-2 bg-orange-600 rounded-full" />
                        <div className="w-0.5 h-2 bg-orange-600 rounded-full" />
                        <div className="w-0.5 h-2 bg-orange-600 rounded-full" />
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes flap-left {
                    0%, 100% { transform: rotate(-12deg); }
                    50% { transform: rotate(-40deg); }
                }
                @keyframes flap-right {
                    0%, 100% { transform: rotate(12deg); }
                    50% { transform: rotate(40deg); }
                }
                @keyframes fade-in-scale {
                    0% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-100%) scale(0.8);
                    }
                    100% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(-100%) scale(1);
                    }
                }
                .animate-flap-left {
                    animation: flap-left 0.3s ease-in-out infinite;
                }
                .animate-flap-right {
                    animation: flap-right 0.3s ease-in-out infinite;
                }
                .animate-fade-in-scale {
                    animation: fade-in-scale 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    )
}
