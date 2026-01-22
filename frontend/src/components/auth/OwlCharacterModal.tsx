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

        // Head rotation: ±8° based on horizontal mouse position (Reduced from 15°)
        const headRotation = (deltaX / 300) * 8
        const clampedHeadRotation = Math.max(-8, Math.min(8, headRotation))

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

            {/* Owl Container - Head Only */}
            <div className="relative w-40 h-32" style={{ perspective: '800px' }}>
                {/* HEAD GROUP - Rotates with mouse (Sideways 3D) */}
                <div
                    className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full transition-transform duration-100 ease-out z-20"
                    style={{
                        transform: `translateX(-50%) rotateY(${headRotation * 1.5}deg)`, // Single unified rotation
                        transformStyle: 'preserve-3d'
                    }}
                >
                    {/* Ear Tufts - Attached to head */}
                    <div className="absolute top-2 left-4 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[28px] border-b-[#3E2723] transform -rotate-[20deg]" />
                    <div className="absolute top-2 right-4 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[28px] border-b-[#3E2723] transform rotate-[20deg]" />

                    {/* Head Base */}
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-32 h-28 bg-gradient-to-b from-[#3E2723] to-[#1A0F0A] rounded-[45%] shadow-xl" />

                    {/* Face Mask - Standard Position (No loose sliding) */}
                    <div
                        className="absolute top-9 left-1/2 transform -translate-x-1/2 w-26 h-20 bg-[#F5F5DC] rounded-[40%]"
                        style={{ width: '7rem', height: '5rem' }}
                    />

                    {/* Eyebrows */}
                    <div
                        className="absolute top-11 left-10 w-9 h-2.5 bg-[#1A0F0A] rounded-full transition-all duration-300 shadow-sm"
                        style={{ transform: `rotate(${eyebrowRaise}deg)` }}
                    />
                    <div
                        className="absolute top-11 right-10 w-9 h-2.5 bg-[#1A0F0A] rounded-full transition-all duration-300 shadow-sm"
                        style={{ transform: `rotate(${-eyebrowRaise}deg)` }}
                    />

                    {/* Eyes - Fixed position relative to head (moves with rotateY) */}
                    {eyesOpen ? (
                        <div className="absolute top-[3.75rem] left-1/2 transform -translate-x-1/2 flex gap-2">
                            {/* Left Eye */}
                            <div className="relative w-11 h-11 bg-white rounded-full shadow-lg border-[3px] border-[#1A0F0A] overflow-hidden">
                                <div
                                    className="absolute top-1/2 left-1/2 w-8 h-8 bg-gradient-to-br from-[#FFC107] to-[#FF6F00] rounded-full transition-transform duration-100 ease-out shadow-inner"
                                    style={{ transform: `translate(calc(-50% + ${eyeX}px), calc(-50% + ${eyeY}px))` }}
                                >
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full">
                                        <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full opacity-90" />
                                    </div>
                                </div>
                            </div>

                            {/* Right Eye */}
                            <div className="relative w-11 h-11 bg-white rounded-full shadow-lg border-[3px] border-[#1A0F0A] overflow-hidden">
                                <div
                                    className="absolute top-1/2 left-1/2 w-8 h-8 bg-gradient-to-br from-[#FFC107] to-[#FF6F00] rounded-full transition-transform duration-100 ease-out shadow-inner"
                                    style={{ transform: `translate(calc(-50% + ${eyeX}px), calc(-50% + ${eyeY}px))` }}
                                >
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full">
                                        <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full opacity-90" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute top-[4.5rem] left-1/2 transform -translate-x-1/2 flex gap-4">
                            <div className="w-10 h-1.5 bg-[#1A0F0A] rounded-full" />
                            <div className="w-10 h-1.5 bg-[#1A0F0A] rounded-full" />
                        </div>
                    )}

                    {/* Beak */}
                    <div className="absolute top-[7rem] left-1/2 transform -translate-x-1/2 z-10">
                        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] border-t-orange-600 drop-shadow-md" />
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
