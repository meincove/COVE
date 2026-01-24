"use client"

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { useAuthModal } from "@/context/AuthModalContext"
import ParticleWave from "@/components/ParticleWave"
import CountUp from "@/components/CountUp"
import { ArrowRight, Sparkles, ShoppingBag, Truck, RotateCcw, Building2, Star, Users } from "lucide-react"
import { useRouter } from "next/navigation"

export default function WelcomePage() {
  const router = useRouter()
  const { openAuthModal } = useAuthModal()

  const partnerBrands = useMemo(
    () => [
      "GUCCI",
      "PRADA",
      "VERSACE",
      "DIOR",
      "CHANEL",
      "BALENCIAGA",
      "FENDI",
      "GIVENCHY",
      "VALENTINO",
      "BURBERRY",
      "SAINT LAURENT",
      "BOTTEGA VENETA",
    ],
    []
  )

  const handleEnter = (target: "shop" | "platform") => {
    // Open the new AuthModal directly
    const destination = target === "shop" ? "/shopping" : "/partner-onboarding"

    // Set storage for redirect flow if needed, though context handles some of this
    if (typeof window !== 'undefined') {
      localStorage.setItem('cove_selected_path', target === "shop" ? "shopping" : "platform")
      localStorage.setItem('cove_destination', destination)
    }

    openAuthModal("sign-up", destination)
  }

  // Scroll progress tracking for ParticleWave animation
  const mainRef = useRef<HTMLElement>(null)
  const [scrollProgress, setScrollProgress] = useState(0)

  const handleScroll = useCallback(() => {
    const container = mainRef.current
    if (!container) return

    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight - container.clientHeight

    // Calculate progress: 0 at top, 1 at bottom
    const progress = scrollHeight > 0 ? Math.min(1, Math.max(0, scrollTop / scrollHeight)) : 0
    setScrollProgress(progress)
  }, [])

  useEffect(() => {
    const container = mainRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <main ref={mainRef} className="h-screen w-screen overflow-y-auto snap-y snap-mandatory bg-gradient-to-br from-[#F8F9FA] via-[#FAFBFC] to-[#F5F6F8] text-gray-900">
      {/* Particle Wave Background */}
      <ParticleWave scrollProgress={scrollProgress} />

      {/* Gradient Overlay for Depth - Fixed */}
      <div className="fixed inset-0 pointer-events-none z-[1] bg-gradient-to-b from-transparent via-[#F8F9FA]/20 to-[#F5F6F8]/50"></div>

      {/* =========================
                PAGE 1 — INTRO (Light Theme)
               ========================= */}
      <section className="snap-start min-h-screen w-full relative overflow-hidden z-10">
        <div className="relative z-10 min-h-screen w-full flex items-center justify-center px-6 sm:px-10 md:px-12 lg:px-16 pt-12 sm:pt-20 md:pt-24 lg:pt-28 pb-16 sm:pb-20">
          <div className="max-w-7xl w-full flex flex-col lg:grid lg:grid-cols-2 gap-10 lg:gap-16 xl:gap-20 items-center">
            {/* LEFT - Text Content */}
            <div className="w-full text-center lg:text-left order-first">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center lg:items-start"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 shadow-sm mb-4">
                  <span className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.45)]" />
                  AI fashion marketplace
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight text-gray-900">
                  Your Style,
                  <div className="text-gray-400 mt-1 sm:mt-2">Reimagined</div>
                </h1>

                <p className="mt-6 sm:mt-8 md:mt-10 max-w-md text-sm sm:text-base md:text-lg text-gray-500 font-medium leading-relaxed tracking-tight">
                  Discover curated collections powered by AI. Get personalized styling from Bubbles,
                  your intelligent fashion assistant.
                </p>

                <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                  <motion.button
                    onClick={() => handleEnter("shop")}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="group flex items-center gap-2 rounded-full bg-black px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-medium text-white shadow-lg shadow-black/20 transition-all hover:bg-gray-800"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </motion.button>
                  <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline">Scroll to explore</span>
                </div>
              </motion.div>
            </div>

            {/* RIGHT - Logo + Stats */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center lg:items-end gap-6 sm:gap-8 md:gap-10 order-last mt-8 lg:mt-0"
            >
              <div className="font-['Atop'] text-[3.5rem] sm:text-6xl md:text-7xl lg:text-8xl xl:text-[6.5rem] text-gray-900 leading-none">COVE</div>

              {/* Stats with Count Animation */}
              <div className="flex gap-6 sm:gap-8 md:gap-10 text-center">
                <div>
                  <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
                    <CountUp end={50} suffix="+" duration={2000} />
                  </div>
                  <div className="text-xs sm:text-sm md:text-base text-gray-500">Brands</div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
                    <CountUp end={10} suffix="K+" duration={2000} />
                  </div>
                  <div className="text-xs sm:text-sm md:text-base text-gray-500">Products</div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">AI</div>
                  <div className="text-xs sm:text-sm md:text-base text-gray-500">Powered</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-gray-300 flex items-start justify-center p-2"
          >
            <div className="w-1 h-2 bg-gray-400 rounded-full" />
          </motion.div>
        </div>
      </section>

      {/* =========================
                PAGE 2 — VALUE PROPS
               ========================= */}
      <section className="snap-start min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-white/95 to-[#F8F9FA]/90 px-6 sm:px-10 md:px-12 lg:px-16 py-16 sm:py-20 relative z-20">
        <div className="max-w-7xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 sm:mb-12 md:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">Why COVE?</h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-500 max-w-2xl mx-auto px-4">
              We're building the future of fashion retail with AI at its core.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {[
              {
                icon: Sparkles,
                title: "AI Personal Stylist",
                description: "Bubbles learns your style and creates personalized outfits just for you. No more endless scrolling."
              },
              {
                icon: ShoppingBag,
                title: "Curated Collections",
                description: "We partner with the best brands to bring you hand-picked collections that match your aesthetic."
              },
              {
                icon: Truck,
                title: "Fast & Free Shipping",
                description: "Free shipping on orders over $100. Express delivery available to get your looks faster."
              },
              {
                icon: RotateCcw,
                title: "Easy Returns",
                description: "Not the right fit? Return any item within 30 days, no questions asked. We make it simple."
              },
              {
                icon: Star,
                title: "Premium Quality",
                description: "Every item is vetted for quality. We only work with brands that meet our high standards."
              },
              {
                icon: Users,
                title: "Community Driven",
                description: "Join thousands of style-conscious shoppers who trust COVE for their wardrobe needs."
              }
            ].map((prop, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                  <prop.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2">{prop.title}</h3>
                <p className="text-sm sm:text-base text-gray-500 leading-relaxed">{prop.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================
                PAGE 3 — BRAND MARQUEE
               ========================= */}
      <section className="snap-start min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-[#F8F9FA]/95 to-[#F5F6F8] px-6 sm:px-10 md:px-12 lg:px-16 py-16 sm:py-20 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-14"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-5">Trusted by the Best</h2>
          <p className="text-lg sm:text-xl md:text-xl text-gray-500">World-class brands, one platform.</p>
        </motion.div>

        {/* Brand Marquee */}
        <div className="w-full overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 md:w-32 bg-gradient-to-r from-[#F8F9FA] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 md:w-32 bg-gradient-to-l from-[#F8F9FA] to-transparent z-10" />

          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex gap-8 sm:gap-12 md:gap-16 whitespace-nowrap"
          >
            {[...partnerBrands, ...partnerBrands].map((brand, idx) => (
              <div
                key={`${brand}-${idx}`}
                className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-300 hover:text-gray-900 transition-colors cursor-default tracking-wider"
              >
                {brand}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Partner CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10 sm:mt-16 text-center"
        >
          <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4">Are you a brand looking to grow?</p>
          <button
            onClick={() => handleEnter("platform")}
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-300 rounded-full text-sm sm:text-base font-medium hover:border-black hover:bg-black hover:text-white transition-all"
          >
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
            Become a Partner
          </button>
        </motion.div>
      </section>



      {/* Auth Dialog - REMOVED, using Context globally now */}
    </main>
  )
}
