"use client"

import React, { useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import AuthDialog from "@/src/components/auth/AuthDialog"
import SplitGateSection from "@/src/sections/welcome/SplitGateSection"
import SplineFaintBg from "@/src/components/background/SplineFaintBg"
import { ArrowRight, Sparkles, ShoppingBag, Truck, RotateCcw, Building2, Star, Users } from "lucide-react"
import { useRouter } from "next/navigation"

export default function WelcomePage() {
  const router = useRouter()
  const splitRef = useRef<HTMLElement | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogConfig, setDialogConfig] = useState<{
    destination: "/shopping" | "/partner-onboarding"
    pathType: "shopping" | "platform"
  }>({ destination: "/shopping", pathType: "shopping" })

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

  const goToSplit = () => {
    splitRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleEnter = (target: "shop" | "platform") => {
    if (target === "shop") {
      setDialogConfig({ destination: "/shopping", pathType: "shopping" })
    } else {
      setDialogConfig({ destination: "/partner-onboarding", pathType: "platform" })
    }
    setDialogOpen(true)
  }

  return (
    <main className="h-screen w-screen overflow-y-auto snap-y snap-mandatory bg-[#FAFAF8] text-gray-900">
      {/* =========================
                PAGE 1 — INTRO (Light Theme)
               ========================= */}
      <section className="snap-start min-h-screen w-full relative overflow-hidden bg-[#FAFAF8]">
        {/* Subtle animated background */}
        <SplineFaintBg
          src="https://my.spline.design/particlesmoment-kW3xvYny6weIhXJ3vbs2M2bB/"
          opacity={0.35}
          className="z-0"
        />

        {/* Light background layers */}
        <div className="absolute inset-0 z-[1]">
          <div className="absolute inset-0 bg-[radial-gradient(1000px_600px_at_30%_20%,rgba(0,0,0,0.03),transparent_60%),radial-gradient(900px_500px_at_70%_70%,rgba(34,197,94,0.06),transparent_60%)]" />
          <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:48px_48px]" />
        </div>

        <div className="relative z-10 min-h-screen w-full flex items-center justify-center px-6 pt-32">
          <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* LEFT */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm text-gray-600 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.45)]" />
                  AI fashion marketplace + brand platform
                </div>

                <h1 className="mt-6 text-5xl md:text-6xl xl:text-7xl font-bold leading-[1.08] tracking-tight">
                  Your Style,
                  <br />
                  <span className="text-gray-400">Reimagined</span>
                </h1>

                <p className="mt-6 max-w-md text-lg text-gray-500 leading-relaxed">
                  Discover curated collections powered by AI. Get personalized styling from Bubbles,
                  your intelligent fashion assistant.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <motion.button
                    onClick={goToSplit}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="group flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/20 transition-all hover:bg-gray-800"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </motion.button>
                  <span className="text-sm text-gray-400">Scroll to explore</span>
                </div>
              </motion.div>
            </div>

            {/* RIGHT - Logo + Stats */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center lg:items-end gap-8"
            >
              <div className="text-8xl font-black tracking-[0.1em] text-gray-900">COVE</div>

              {/* Stats */}
              <div className="flex gap-8 text-center">
                {[
                  { value: "50+", label: "Brands" },
                  { value: "10K+", label: "Products" },
                  { value: "AI", label: "Powered" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
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
      <section className="snap-start min-h-screen w-full flex items-center justify-center bg-white px-6 py-20">
        <div className="max-w-6xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why COVE?</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              We're building the future of fashion retail with AI at its core.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
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
                className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-colors"
              >
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4">
                  <prop.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{prop.title}</h3>
                <p className="text-gray-500 leading-relaxed">{prop.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================
                PAGE 3 — BRAND MARQUEE
               ========================= */}
      <section className="snap-start min-h-screen w-full flex flex-col items-center justify-center bg-[#FAFAF8] px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Trusted by the Best</h2>
          <p className="text-xl text-gray-500">World-class brands, one platform.</p>
        </motion.div>

        {/* Brand Marquee */}
        <div className="w-full overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#FAFAF8] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#FAFAF8] to-transparent z-10" />

          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex gap-16 whitespace-nowrap"
          >
            {[...partnerBrands, ...partnerBrands].map((brand, idx) => (
              <div
                key={`${brand}-${idx}`}
                className="text-3xl font-bold text-gray-300 hover:text-gray-900 transition-colors cursor-default tracking-wider"
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
          className="mt-16 text-center"
        >
          <p className="text-gray-500 mb-4">Are you a brand looking to grow?</p>
          <button
            onClick={() => handleEnter("platform")}
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 rounded-full font-medium hover:border-black hover:bg-black hover:text-white transition-all"
          >
            <Building2 className="h-5 w-5" />
            Become a Partner
          </button>
        </motion.div>
      </section>

      {/* =========================
                PAGE 4 — SPLIT GATE (Shop vs Platform)
               ========================= */}
      <SplitGateSection
        ref={splitRef}
        className="snap-start"
        onEnterShop={() => handleEnter("shop")}
        onEnterPlatform={() => handleEnter("platform")}
      />

      {/* Auth Dialog */}
      <AuthDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        destination={dialogConfig.destination}
        pathType={dialogConfig.pathType}
      />
    </main>
  )
}
