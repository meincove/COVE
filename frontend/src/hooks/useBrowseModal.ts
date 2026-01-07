"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

type BrowseState = { open: boolean; type: string | null }

function lockBodyScroll() {
    const y = window.scrollY
    document.body.style.position = "fixed"
    document.body.style.top = `-${y}px`
    document.body.style.left = "0"
    document.body.style.right = "0"
    document.body.style.width = "100%"
    return y
}

function unlockBodyScroll(prevY: number) {
    document.body.style.position = ""
    document.body.style.top = ""
    document.body.style.left = ""
    document.body.style.right = ""
    document.body.style.width = ""
    window.scrollTo(0, prevY)
}

export function useBrowseModal() {
    const router = useRouter()
    const pathname = usePathname()
    const sp = useSearchParams()

    const [state, setState] = useState<BrowseState>({
        open: !!sp.get("browse"),
        type: sp.get("browse"),
    })

    const scrollYRef = useRef(0)

    useEffect(() => {
        const t = sp.get("browse")
        setState({ open: !!t, type: t })
    }, [sp])

    const openBrowse = useCallback(
        (type: string) => {
            scrollYRef.current = lockBodyScroll()
            router.push(`${pathname}?browse=${encodeURIComponent(type)}`, { scroll: false })
        },
        [router, pathname]
    )

    const closeBrowse = useCallback(() => {
        router.push(pathname, { scroll: false })
        requestAnimationFrame(() => unlockBodyScroll(scrollYRef.current))
    }, [router, pathname])

    return useMemo(
        () => ({ open: state.open, type: state.type, openBrowse, closeBrowse }),
        [state, openBrowse, closeBrowse]
    )
}
