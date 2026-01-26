"use client"

import React from "react"
import { usePathname } from "next/navigation"
import NavbarController from "@/components/Navbar/NavbarController"
import { cn } from "@/lib/utils"

export default function ScrollShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isShopping = pathname === "/shopping"

    return (
        <div
            className={cn(
                // Default app behavior: scroll inside tester-frame
                !isShopping && "tester-frame h-screen w-full overflow-y-auto overflow-x-hidden",

                // Shopping: use window scroll (NO overflow container)
                isShopping && "min-h-[100dvh] w-full overflow-x-hidden"
            )}
        >
            <NavbarController>
                <main>{children}</main>
            </NavbarController>
        </div>
    )
}
