"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"

function labelize(v: string) {
    if (!v) return ""
    if (v.toLowerCase() === "curated") return "Curated Collection"
    return v.charAt(0).toUpperCase() + v.slice(1)
}

export default function HeroCollectionPill({
    options,
    value,
    onChange,
}: {
    options: string[]
    value: string
    onChange?: (v: string) => void
}) {
    const [open, setOpen] = React.useState(false)

    return (
        <div className="relative">
            <motion.button
                type="button"
                onClick={() => setOpen((s) => !s)}
                className="flex items-center gap-2 rounded-full bg-white/80 backdrop-blur border border-black/10 px-4 py-2 shadow-[0_14px_40px_rgba(0,0,0,0.10)]"
                whileTap={{ scale: 0.98 }}
            >
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.35)]" />
                <span className="text-xs font-medium text-black/70">{labelize(value)}</span>
                <span className="text-black/40 text-xs">▾</span>
            </motion.button>

            <AnimatePresence>
                {open ? (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: [0.2, 1, 0.2, 1] }}
                        className="absolute left-1/2 -translate-x-1/2 mt-2"
                    >
                        <div className="flex items-center gap-2 rounded-full bg-white/90 backdrop-blur border border-black/10 p-2 shadow-[0_18px_55px_rgba(0,0,0,0.12)]">
                            {options.map((opt) => {
                                const active = opt === value
                                return (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            onChange?.(opt)
                                            setOpen(false)
                                        }}
                                        className={[
                                            "px-3 py-1.5 rounded-full text-xs font-medium transition",
                                            active ? "bg-black text-white" : "bg-black/5 text-black/70 hover:bg-black/10",
                                        ].join(" ")}
                                    >
                                        {labelize(opt)}
                                    </button>
                                )
                            })}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    )
}
