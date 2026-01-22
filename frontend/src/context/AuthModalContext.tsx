'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type AuthMode = 'sign-in' | 'sign-up'

interface AuthModalContextType {
    isOpen: boolean
    mode: AuthMode

    destination: string | null
    returnTo: string | null

    openAuthModal: (mode: AuthMode, destination?: string) => void
    closeAuthModal: () => void
    switchMode: () => void
}

const AuthModalContext = createContext<AuthModalContextType | null>(null)

export function AuthModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [mode, setMode] = useState<AuthMode>('sign-in')
    const [destination, setDestination] = useState<string | null>(null)
    const [returnTo, setReturnTo] = useState<string | null>(null)

    const openAuthModal = useCallback((newMode: AuthMode, newDestination?: string) => {
        setMode(newMode)
        setIsOpen(true)

        if (typeof window !== 'undefined') {
            const storedReturnTo = localStorage.getItem('cove_return_to')
            const storedDestination = localStorage.getItem('cove_destination')

            setReturnTo(storedReturnTo || null)
            setDestination(newDestination || storedDestination || null)

            if (newDestination) localStorage.setItem('cove_destination', newDestination)
        } else {
            setDestination(newDestination || null)
        }
    }, [])

    const closeAuthModal = useCallback(() => {
        setIsOpen(false)
        // do not clear localStorage here (OAuth callback may need it)
    }, [])

    const switchMode = useCallback(() => {
        setMode((prev) => (prev === 'sign-in' ? 'sign-up' : 'sign-in'))
    }, [])

    return (
        <AuthModalContext.Provider
            value={{
                isOpen,
                mode,
                destination,
                returnTo,
                openAuthModal,
                closeAuthModal,
                switchMode,
            }}
        >
            {children}
        </AuthModalContext.Provider>
    )
}

export function useAuthModal() {
    const context = useContext(AuthModalContext)
    if (!context) throw new Error('useAuthModal must be used within AuthModalProvider')
    return context
}
