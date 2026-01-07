"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"

export default function ScrollIndicator() {
    const [isVisible, setIsVisible] = useState(false)
    const [hasScrolled, setHasScrolled] = useState(false)

    useEffect(() => {
        // Show indicator after 5 seconds if user hasn't scrolled
        const showTimer = setTimeout(() => {
            if (!hasScrolled) {
                setIsVisible(true)
            }
        }, 5000)

        // Listen for scroll events
        const handleScroll = () => {
            if (!hasScrolled) {
                setHasScrolled(true)
                setIsVisible(false)
            }
        }

        window.addEventListener("scroll", handleScroll, { passive: true })

        return () => {
            clearTimeout(showTimer)
            window.removeEventListener("scroll", handleScroll)
        }
    }, [hasScrolled])

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                >
                    <div className="flex flex-col items-center gap-2">
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="flex flex-col items-center"
                        >
                            <span className="text-sm font-medium text-black/60 mb-1">
                                Scroll to Explore
                            </span>
                            <ChevronDown className="w-5 h-5 text-black/40" />
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
