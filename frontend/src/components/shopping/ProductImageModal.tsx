"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import { FALLBACK_IMG, resolveImgPath } from "@/lib/catalog/shared"

export default function ProductImageModal({
    open,
    title,
    images,
    onClose,
}: {
    open: boolean
    title: string
    images: string[]
    onClose: () => void
}) {
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open, onClose])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[999]">
            <div
                className="absolute inset-0 bg-black/35"
                onMouseDown={onClose}
            />
            <div className="absolute inset-x-0 top-[6vh] mx-auto w-[min(980px,92vw)] rounded-2xl bg-white shadow-[0_30px_80px_rgba(0,0,0,0.25)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
                    <div className="text-sm font-semibold text-black/80">{title}</div>
                    <button
                        onClick={onClose}
                        className="h-9 w-9 rounded-full border border-black/10 hover:bg-black/5 grid place-items-center"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {(images?.length ? images : [FALLBACK_IMG]).map((img, i) => (
                            <div
                                key={`${img}-${i}`}
                                className="rounded-xl overflow-hidden bg-black/5 border border-black/10 aspect-square"
                            >
                                <img
                                    src={resolveImgPath(img)}
                                    alt={`${title} ${i + 1}`}
                                    className="w-full h-full object-cover"
                                    decoding="async"
                                    loading="lazy"
                                    onError={(e) => {
                                        ; (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
