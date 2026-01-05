"use client"

import { Loader2 } from "lucide-react"

export default function HeroPill({
    text,
    loading,
}: {
    text: string
    loading: boolean
}) {
    return (
        <div className="px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-md border border-neutral-200/60 shadow-lg shadow-black/5 flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />}
            <p className="text-xs text-neutral-600 font-medium tracking-wide">
                {loading ? "New catalog loading…" : text}
            </p>
        </div>
    )
}
