"use client"

import React, { forwardRef, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import ParticleWave from "@/src/components/ParticleWave"

type Side = "shop" | "platform" | null

type Props = {
    onEnterShop: () => void
    onEnterPlatform: () => void
    className?: string
}

const easeOutExpo: [number, number, number, number] = [0.22, 1, 0.36, 1]

type QuizAnswers = {
    vibe?: "minimal" | "street" | "classic" | "avant"
    colors?: "mono" | "earth" | "bold" | "pastel"
    fit?: "slim" | "regular" | "oversized"
    budget?: "entry" | "mid" | "high"
}

const quizSteps = [
    {
        key: "vibe",
        title: "Pick your vibe",
        options: [
            { id: "minimal", label: "Minimal" },
            { id: "street", label: "Street" },
            { id: "classic", label: "Classic" },
            { id: "avant", label: "Avant" },
        ] as const,
    },
    {
        key: "colors",
        title: "Preferred palette",
        options: [
            { id: "mono", label: "Monochrome" },
            { id: "earth", label: "Earth tones" },
            { id: "bold", label: "Bold accents" },
            { id: "pastel", label: "Pastel" },
        ] as const,
    },
    {
        key: "fit",
        title: "Fit you like",
        options: [
            { id: "slim", label: "Slim" },
            { id: "regular", label: "Regular" },
            { id: "oversized", label: "Oversized" },
        ] as const,
    },
    {
        key: "budget",
        title: "Budget range",
        options: [
            { id: "entry", label: "Entry" },
            { id: "mid", label: "Mid" },
            { id: "high", label: "High" },
        ] as const,
    },
]

const SplitGateSection = forwardRef<HTMLElement, Props>(function SplitGateSection(
    { onEnterShop, onEnterPlatform, className },
    ref
) {
    const router = useRouter()
    const [active, setActive] = useState<Side>(null)

    // Shop “Curate” mode
    const [shopMode, setShopMode] = useState<"info" | "quiz">("info")
    const [step, setStep] = useState(0)
    const [answers, setAnswers] = useState<QuizAnswers>({})

    const leftGrow = active === "shop" ? 7 : active === "platform" ? 3 : 5
    const rightGrow = active === "platform" ? 7 : active === "shop" ? 3 : 5
    const seamLeft = active === "shop" ? "70%" : active === "platform" ? "30%" : "50%"

    const canContinue = useMemo(() => {
        const key = quizSteps[step]?.key as keyof QuizAnswers | undefined
        if (!key) return false
        return Boolean(answers[key])
    }, [answers, step])

    const resetQuiz = () => {
        setShopMode("info")
        setStep(0)
        setAnswers({})
    }

    const goNext = () => {
        if (!canContinue) return
        setStep((s) => Math.min(s + 1, quizSteps.length - 1))
    }

    const goPrev = () => setStep((s) => Math.max(s - 1, 0))

    const finishQuiz = () => {
        const params = new URLSearchParams()
        if (answers.vibe) params.set("vibe", answers.vibe)
        if (answers.colors) params.set("colors", answers.colors)
        if (answers.fit) params.set("fit", answers.fit)
        if (answers.budget) params.set("budget", answers.budget)
        router.push(`/shopping?${params.toString()}`)
    }

    return (
        <section
            ref={ref}
            className={[
                "snap-start min-h-screen w-full relative overflow-hidden",
                className ?? "",
            ].join(" ")}
        >
            <div className="absolute inset-0 bg-neutral-950" />

            {/* Seam */}
            <motion.div
                className="hidden md:block absolute top-0 bottom-0 w-[2px] z-30"
                animate={{ left: seamLeft }}
                transition={{ duration: 0.55, ease: easeOutExpo }}
                style={{
                    background:
                        "linear-gradient(to bottom, transparent, rgba(255,255,255,0.14), transparent)",
                    filter: "drop-shadow(0 0 18px rgba(255,255,255,0.18))",
                }}
            />

            <div className="relative z-10 h-screen w-full flex flex-col md:flex-row">
                {/* LEFT — SHOP */}
                <motion.section
                    className="relative h-1/2 md:h-full min-w-0"
                    animate={{ flexGrow: leftGrow }}
                    transition={{ duration: 0.55, ease: easeOutExpo }}
                    onPointerEnter={() => setActive("shop")}
                    onPointerLeave={() => setActive(null)}
                >
                    <ShopPanel
                        active={active === "shop"}
                        mode={shopMode}
                        step={step}
                        answers={answers}
                        onSetAnswer={(k, v) => setAnswers((a) => ({ ...a, [k]: v }))}
                        onVisitStore={() => router.push("/shopping")}
                        onCurate={() => setShopMode("quiz")}
                        onCancelQuiz={resetQuiz}
                        onPrev={goPrev}
                        onNext={goNext}
                        onFinish={finishQuiz}
                        canContinue={canContinue}
                    />
                </motion.section>

                {/* RIGHT — PLATFORM */}
                <motion.section
                    className="relative h-1/2 md:h-full min-w-0"
                    animate={{ flexGrow: rightGrow }}
                    transition={{ duration: 0.55, ease: easeOutExpo }}
                    onPointerEnter={() => setActive("platform")}
                    onPointerLeave={() => setActive(null)}
                >
                    <PlatformPanel active={active === "platform"} onEnter={onEnterPlatform} />
                </motion.section>
            </div>
        </section>
    )
})

export default SplitGateSection

/* ------------------------------
   SHOP PANEL
-------------------------------- */

function ShopPanel({
    active,
    mode,
    step,
    answers,
    onSetAnswer,
    onVisitStore,
    onCurate,
    onCancelQuiz,
    onPrev,
    onNext,
    onFinish,
    canContinue,
}: {
    active: boolean
    mode: "info" | "quiz"
    step: number
    answers: QuizAnswers
    onSetAnswer: <K extends keyof QuizAnswers>(k: K, v: NonNullable<QuizAnswers[K]>) => void
    onVisitStore: () => void
    onCurate: () => void
    onCancelQuiz: () => void
    onPrev: () => void
    onNext: () => void
    onFinish: () => void
    canContinue: boolean
}) {
    const current = quizSteps[step] as any
    const isLast = step === quizSteps.length - 1

    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* background */}
            <div className="absolute inset-0">
                <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(135deg,rgba(248,250,252,0.98),rgba(245,240,237,0.96),rgba(240,234,230,0.95))" }}
                />
                <div
                    className="absolute inset-0 opacity-[0.08]"
                    style={{
                        backgroundImage: "radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)",
                        backgroundSize: "28px 28px"
                    }}
                />
                <div
                    className="absolute inset-0"
                    style={{ background: "radial-gradient(900px 520px at 30% 30%, rgba(236,72,153,0.14), transparent 55%)" }}
                />
                <div
                    className="absolute inset-0"
                    style={{ background: "radial-gradient(1200px 800px at 50% 50%, transparent 35%, rgba(0,0,0,0.10) 100%)" }}
                />
            </div>

            <HUDFrame tone="gold" active={active} />

            <div className="relative z-10 h-full flex flex-col">
                <div className="px-8 md:px-12 pt-10 md:pt-14">
                    <div className="inline-flex items-center gap-2 rounded-full bg-black/5 border border-black/10 px-4 py-2 text-xs text-black/60">
                        COVE SHOP • luxury discovery
                    </div>

                    {mode === "info" ? (
                        <>
                            <h3 className="mt-5 text-3xl md:text-5xl font-semibold text-black tracking-tight">
                                Shop, but personalized.
                            </h3>

                            <p className="mt-3 max-w-xl text-black/60 leading-relaxed">
                                We learn your taste first — then the store adapts: silhouettes, colors, materials, and pricing preference.
                            </p>

                            {/* ✅ CTAs */}
                            <div className="mt-7 flex flex-wrap gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onVisitStore}
                                    className="rounded-2xl px-6 py-4 bg-black text-white font-medium shadow-[0_18px_50px_rgba(0,0,0,0.20)]"
                                >
                                    Visit Store →
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onCurate}
                                    className="rounded-2xl px-6 py-4 border border-black/10 bg-black/5 text-black/80 hover:bg-black/10 transition"
                                >
                                    Curate Shop
                                </motion.button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Quiz header */}
                            <div className="mt-5 flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-2xl md:text-4xl font-semibold text-black tracking-tight">
                                        Curate your shop
                                    </h3>
                                    <p className="mt-1 text-black/60 text-sm">
                                        Answer a few quick questions — we’ll tailor the store to your taste.
                                    </p>
                                </div>

                                <button
                                    onClick={onCancelQuiz}
                                    className="rounded-xl px-4 py-2 border border-black/10 bg-white/60 text-black/70 hover:bg-white/80 transition"
                                >
                                    Cancel
                                </button>
                            </div>

                            {/* Progress dots */}
                            <div className="mt-4 flex items-center gap-2">
                                {quizSteps.map((_, i) => (
                                    <div
                                        key={i}
                                        className={[
                                            "h-2 w-2 rounded-full transition",
                                            i === step ? "bg-black/70" : "bg-black/20",
                                        ].join(" ")}
                                    />
                                ))}
                            </div>

                            {/* Question card */}
                            <div className="mt-6 rounded-3xl border border-black/10 bg-white/55 backdrop-blur-sm p-6 shadow-[0_22px_60px_rgba(0,0,0,0.10)]">
                                <div className="text-black font-medium">{current.title}</div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {current.options.map((opt: any) => {
                                        const selected = (answers as any)[current.key] === opt.id
                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={() => onSetAnswer(current.key, opt.id)}
                                                className={[
                                                    "rounded-2xl px-4 py-2 text-sm border transition",
                                                    selected
                                                        ? "bg-black text-white border-black shadow-[0_14px_36px_rgba(0,0,0,0.16)]"
                                                        : "bg-white/70 text-black/70 border-black/10 hover:bg-white",
                                                ].join(" ")}
                                            >
                                                {opt.label}
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Nav buttons */}
                                <div className="mt-6 flex items-center justify-between">
                                    <button
                                        onClick={onPrev}
                                        disabled={step === 0}
                                        className={[
                                            "rounded-2xl px-5 py-3 border text-sm transition",
                                            step === 0
                                                ? "border-black/10 bg-black/5 text-black/30 cursor-not-allowed"
                                                : "border-black/10 bg-black/5 text-black/70 hover:bg-black/10",
                                        ].join(" ")}
                                    >
                                        Back
                                    </button>

                                    {isLast ? (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={onFinish}
                                            disabled={!canContinue}
                                            className={[
                                                "rounded-2xl px-6 py-3 text-sm font-medium transition shadow-[0_18px_50px_rgba(0,0,0,0.20)]",
                                                canContinue ? "bg-black text-white" : "bg-black/20 text-black/40 cursor-not-allowed",
                                            ].join(" ")}
                                        >
                                            Build my shop →
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={onNext}
                                            disabled={!canContinue}
                                            className={[
                                                "rounded-2xl px-6 py-3 text-sm font-medium transition shadow-[0_18px_50px_rgba(0,0,0,0.20)]",
                                                canContinue ? "bg-black text-white" : "bg-black/20 text-black/40 cursor-not-allowed",
                                            ].join(" ")}
                                        >
                                            Continue →
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* details only in info mode */}
                {mode === "info" && (
                    <div className="mt-8 flex-1 px-8 md:px-12 pb-10 overflow-y-auto no-scrollbar">
                        <DetailBlock title="Taste onboarding" desc="A quick, game-like selection flow to capture your aesthetic profile." />
                        <DetailBlock title="Curated drops" desc="Instead of endless inventory, we show fewer, better matches." />
                        <DetailBlock title="Fit confidence" desc="Future-ready for sizing intelligence & custom measurements." />
                        <DetailBlock title="Checkout optimized" desc="Fast, clean, conversion-first flow with premium UX." />
                        <div className="h-10" />
                    </div>
                )}
            </div>

            <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ opacity: active ? 1 : 0 }}
                transition={{ duration: 0.25 }}
                style={{ boxShadow: "inset 0 0 110px rgba(0,0,0,0.16)" }}
            />
        </div>
    )
}

/* ------------------------------
   PLATFORM PANEL (ParticleWave as elegant faint layer)
-------------------------------- */

function PlatformPanel({ active, onEnter }: { active: boolean; onEnter: () => void }) {
    return (
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0">
                <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(135deg,rgba(12,12,12,1),rgba(20,20,20,1),rgba(10,10,10,1))" }}
                />
                <div
                    className="absolute inset-0 opacity-[0.10]"
                    style={{
                        backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.10) 1px, transparent 1px)",
                        backgroundSize: "56px 56px"
                    }}
                />
                <div
                    className="absolute inset-0"
                    style={{ background: "radial-gradient(900px 520px at 60% 35%, rgba(34,197,94,0.16), transparent 60%)" }}
                />
                <div
                    className="absolute inset-0"
                    style={{ background: "radial-gradient(1200px 800px at 50% 50%, transparent 35%, rgba(0,0,0,0.70) 100%)" }}
                />
            </div>

            {/* ✅ ParticleWave faint background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.22]">
                    <ParticleWave />
                </div>
                <div
                    className="absolute inset-0"
                    style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.75) 100%)" }}
                />
            </div>

            <HUDFrame tone="silver" active={active} />

            <div className="relative z-10 h-full flex flex-col">
                <div className="px-8 md:px-12 pt-10 md:pt-14">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-xs text-white/70">
                        COVE PLATFORM • brand console
                    </div>

                    <h3 className="mt-5 text-3xl md:text-5xl font-semibold tracking-tight">
                        Sell with intelligence.
                    </h3>

                    <p className="mt-3 max-w-xl text-white/70 leading-relaxed">
                        Analytics, inventory insights, conversion tooling — and an AI layer that feels like a store manager.
                    </p>

                    <div className="mt-7 flex gap-3">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onEnter}
                            className="rounded-2xl px-6 py-4 bg-emerald-500 text-black font-medium shadow-[0_18px_50px_rgba(16,185,129,0.20)]"
                        >
                            Join Platform →
                        </motion.button>

                        <button className="rounded-2xl px-6 py-4 border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 transition">
                            Request demo
                        </button>
                    </div>
                </div>

                <div className="mt-8 flex-1 px-8 md:px-12 pb-10 overflow-y-auto no-scrollbar">
                    <DetailBlock title="Brand analytics" desc="Track funnels, retention, product performance, and cohort behavior." dark />
                    <DetailBlock title="Inventory intelligence" desc="Predict stockouts, highlight winners, and reduce dead inventory." dark />
                    <DetailBlock title="AI workflows" desc="Customer support, product Q&A, and conversion nudges — automated." dark />
                    <DetailBlock title="Partner onboarding" desc="A guided setup flow for brands — minimal ops, maximum clarity." dark />
                    <div className="h-10" />
                </div>
            </div>

            <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ opacity: active ? 1 : 0 }}
                transition={{ duration: 0.25 }}
                style={{ boxShadow: "inset 0 0 120px rgba(0,0,0,0.80)" }}
            />
        </div>
    )
}

/* ------------------------------
   HUD + blocks
-------------------------------- */

function HUDFrame({ tone, active }: { tone: "gold" | "silver"; active: boolean }) {
    const stroke = tone === "gold" ? "rgba(212,175,55,0.55)" : "rgba(220,220,220,0.45)"
    const glow = tone === "gold" ? "rgba(212,175,55,0.55)" : "rgba(120,220,255,0.35)"

    return (
        <div className="absolute inset-0 pointer-events-none z-20">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <motion.rect
                    x="2.5"
                    y="2.5"
                    width="95"
                    height="95"
                    rx="6"
                    ry="6"
                    fill="none"
                    stroke={stroke}
                    strokeWidth="0.7"
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray="12 10 6 14 22 10"
                    animate={{ strokeDashoffset: active ? 18 : 0, opacity: active ? 1 : 0.55 }}
                    transition={{ duration: 0.6, ease: easeOutExpo }}
                />
                <motion.rect
                    x="2.5"
                    y="2.5"
                    width="95"
                    height="95"
                    rx="6"
                    ry="6"
                    fill="none"
                    stroke={glow}
                    strokeWidth="1.2"
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray="18 14 10 18 28 14"
                    animate={{ opacity: active ? 1 : 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ filter: "blur(1.2px)" }}
                />
                <g opacity={active ? 0.9 : 0.45}>
                    <path d="M6 10 L16 10" stroke={stroke} strokeWidth="0.8" />
                    <path d="M10 6 L10 16" stroke={stroke} strokeWidth="0.8" />
                    <path d="M84 10 L94 10" stroke={stroke} strokeWidth="0.8" />
                    <path d="M90 6 L90 16" stroke={stroke} strokeWidth="0.8" />
                    <path d="M6 90 L16 90" stroke={stroke} strokeWidth="0.8" />
                    <path d="M10 84 L10 94" stroke={stroke} strokeWidth="0.8" />
                    <path d="M84 90 L94 90" stroke={stroke} strokeWidth="0.8" />
                    <path d="M90 84 L90 94" stroke={stroke} strokeWidth="0.8" />
                </g>
                <g opacity={active ? 0.8 : 0.35}>
                    <circle cx="50" cy="7" r="0.7" fill={stroke} />
                    <circle cx="52.4" cy="7" r="0.7" fill={stroke} />
                    <circle cx="47.6" cy="7" r="0.7" fill={stroke} />
                </g>
            </svg>
        </div>
    )
}

function DetailBlock({ title, desc, dark }: { title: string; desc: string; dark?: boolean }) {
    return (
        <div
            className={[
                "mt-4 rounded-2xl p-5 border backdrop-blur-sm",
                dark ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5",
            ].join(" ")}
        >
            <div className={dark ? "text-white font-medium" : "text-black font-medium"}>{title}</div>
            <div className={dark ? "text-white/65 mt-2 text-sm" : "text-black/60 mt-2 text-sm"}>{desc}</div>
        </div>
    )
}
