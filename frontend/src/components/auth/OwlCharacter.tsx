'use client'

import { useState, useEffect, useRef } from 'react'

interface OwlCharacterProps {
    mousePosition: { x: number; y: number }
    validationState?: 'correct' | 'wrong' | 'idle'
}

export default function OwlCharacter({
    mousePosition,
    validationState = 'idle',
}: OwlCharacterProps) {
    const owlRef = useRef<HTMLDivElement>(null)

    // Visual states
    const [isSleeping, setIsSleeping] = useState(false)
    const [isFlapping, setIsFlapping] = useState(false)
    const [bgColor, setBgColor] = useState('transparent')
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

    // Sleep detection - runs continuously
    useEffect(() => {
        console.log('🔄 Starting sleep detection interval')

        // Clear existing interval
        if (sleepCheckInterval.current) {
            clearInterval(sleepCheckInterval.current)
        }

        // Check every second if we should sleep
        sleepCheckInterval.current = setInterval(() => {
            const now = Date.now()
            const timeSinceMove = now - lastMouseMoveTime.current
            const shouldSleep = timeSinceMove >= 8000 && validationState === 'idle' && !isSleeping

            console.log('💤 Sleep check:', {
                timeSinceMove: Math.floor(timeSinceMove / 1000) + 's',
                validationState,
                isSleeping,
                shouldSleep
            })

            if (shouldSleep) {
                console.log('� GOING TO SLEEP NOW!')
                setIsSleeping(true)
                setEyesOpen(false)
                setMessage("You asleep too?")
                setShowMessage(true)
            }
        }, 1000)

        // Cleanup
        return () => {
            console.log('🧹 Cleaning up sleep interval')
            if (sleepCheckInterval.current) {
                clearInterval(sleepCheckInterval.current)
            }
        }
    }, [validationState, isSleeping])

    // Handle validation state changes
    useEffect(() => {
        if (validationState === 'wrong') {
            console.log('❌ Wrong validation')
            setIsSleeping(false)
            setEyesOpen(true)
            setIsFlapping(true)
            setBgColor('rgba(239, 68, 68, 0.2)')
            setMessage("You can do better!")
            setShowMessage(true)
            setEyebrowRaise(-15)

            setTimeout(() => setIsFlapping(false), 500)
            setTimeout(() => setBgColor('transparent'), 2000)
            setTimeout(() => {
                setShowMessage(false)
                setEyebrowRaise(0)
            }, 3000)

        } else if (validationState === 'correct') {
            console.log('✅ Correct validation')
            setIsSleeping(false)
            setEyesOpen(true)
            setBgColor('rgba(34, 197, 94, 0.2)')
            setMessage("Well done!")
            setShowMessage(true)
            setEyebrowRaise(15)
            setIsFlapping(false)

            setTimeout(() => setBgColor('transparent'), 2000)
            setTimeout(() => {
                setShowMessage(false)
                setEyebrowRaise(0)
            }, 3000)
        }
    }, [validationState])

    // Calculate eye position
    const getEyePosition = () => {
        if (!owlRef.current || isSleeping) return { x: 0, y: 0 }

        const rect = owlRef.current.getBoundingClientRect()
        const owlCenterX = rect.left + rect.width / 2
        const owlCenterY = rect.top + 80

        const deltaX = mousePosition.x - owlCenterX
        const deltaY = mousePosition.y - owlCenterY
        const angle = Math.atan2(deltaY, deltaX)
        const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY) / 200, 1)

        return {
            x: Math.cos(angle) * distance * 8,
            y: Math.sin(angle) * distance * 8
        }
    }

    const eyePos = getEyePosition()

    return (
        <div ref={owlRef} className="relative flex flex-col items-center justify-center h-full">
            {/* Speech Bubble */}
            {showMessage && message && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 -translate-y-full mb-4 z-10 animate-fade-in-scale">
                    <div className="relative bg-white px-6 py-3 rounded-2xl shadow-xl border-2 border-purple-300">
                        <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                            {message}
                        </p>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-white" />
                        </div>
                    </div>
                </div>
            )}

            {/* Owl Container */}
            <div
                className="relative w-48 h-56 rounded-full transition-colors duration-500"
                style={{ backgroundColor: bgColor }}
            >
                {/* Head */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-40 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full shadow-2xl" />

                {/* Ear Tufts */}
                <div className="absolute top-0 left-10 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[28px] border-b-amber-700 transform -rotate-12" />
                <div className="absolute top-0 right-10 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[28px] border-b-amber-700 transform rotate-12" />

                {/* Face */}
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-32 h-32 bg-amber-50 rounded-full" />

                {/* Eyebrows */}
                <div
                    className="absolute top-12 left-14 w-10 h-2 bg-amber-900 rounded-full transition-all duration-300"
                    style={{ transform: `rotate(${eyebrowRaise}deg)` }}
                />
                <div
                    className="absolute top-12 right-14 w-10 h-2 bg-amber-900 rounded-full transition-all duration-300"
                    style={{ transform: `rotate(${-eyebrowRaise}deg)` }}
                />

                {/* Eyes */}
                {eyesOpen ? (
                    <div className="absolute top-16 left-1/2 transform -translate-x-1/2 flex gap-3">
                        <div className="relative w-12 h-14 bg-white rounded-full shadow-inner border-3 border-amber-900">
                            <div
                                className="absolute top-1/2 left-1/2 w-9 h-9 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full transition-transform duration-100 ease-out"
                                style={{ transform: `translate(calc(-50% + ${eyePos.x}px), calc(-50% + ${eyePos.y}px))` }}
                            >
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full">
                                    <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white rounded-full" />
                                </div>
                            </div>
                        </div>

                        <div className="relative w-12 h-14 bg-white rounded-full shadow-inner border-3 border-amber-900">
                            <div
                                className="absolute top-1/2 left-1/2 w-9 h-9 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full transition-transform duration-100 ease-out"
                                style={{ transform: `translate(calc(-50% + ${eyePos.x}px), calc(-50% + ${eyePos.y}px))` }}
                            >
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full">
                                    <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 flex gap-3">
                        <div className="w-12 h-1 bg-amber-900 rounded-full" />
                        <div className="w-12 h-1 bg-amber-900 rounded-full" />
                    </div>
                )}

                {/* Sleeping Z's */}
                {isSleeping && (
                    <div className="absolute -top-2 -right-6 text-2xl font-bold text-purple-400 animate-pulse">
                        Z z z
                    </div>
                )}

                {/* Beak */}
                <div className="absolute top-30 left-1/2 transform -translate-x-1/2">
                    <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-orange-500" />
                </div>

                {/* Body */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-28 h-16 bg-gradient-to-b from-amber-700 to-amber-900 rounded-[50%] shadow-lg" />

                {/* Belly */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-10 bg-amber-100 rounded-[50%]" />

                {/* Wings */}
                <div
                    className={`absolute top-26 -left-3 w-12 h-14 bg-amber-800 rounded-[50%] shadow-md transition-transform duration-150 ${isFlapping ? 'animate-flap-left' : 'transform -rotate-12'
                        }`}
                />
                <div
                    className={`absolute top-26 -right-3 w-12 h-14 bg-amber-800 rounded-[50%] shadow-md transition-transform duration-150 ${isFlapping ? 'animate-flap-right' : 'transform rotate-12'
                        }`}
                />

                {/* Feet */}
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex gap-2">
                    <div className="flex gap-0.5">
                        <div className="w-1 h-3 bg-orange-600 rounded-full" />
                        <div className="w-1 h-3 bg-orange-600 rounded-full" />
                        <div className="w-1 h-3 bg-orange-600 rounded-full" />
                    </div>
                    <div className="flex gap-0.5">
                        <div className="w-1 h-3 bg-orange-600 rounded-full" />
                        <div className="w-1 h-3 bg-orange-600 rounded-full" />
                        <div className="w-1 h-3 bg-orange-600 rounded-full" />
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes flap-left {
                    0%, 100% { transform: rotate(-12deg); }
                    50% { transform: rotate(-45deg); }
                }
                @keyframes flap-right {
                    0%, 100% { transform: rotate(12deg); }
                    50% { transform: rotate(45deg); }
                }
                @keyframes fade-in-scale {
                    0% {
                        opacity: 0;
                        transform: scale(0.8);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
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
