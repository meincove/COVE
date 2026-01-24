"use client"

import { FALLBACK_IMG } from "@/lib/catalog/shared"

export default function ProductImg({
    src,
    alt,
    className,
}: {
    src?: string
    alt: string
    className?: string
}) {
    return (
        <img
            src={src || FALLBACK_IMG}
            alt={alt}
            className={className}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={(e) => {
                ; (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG
            }}
        />
    )
}
