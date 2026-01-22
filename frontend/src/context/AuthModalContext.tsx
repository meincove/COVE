'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type AuthMode = 'sign-in' | 'sign-up'

interface AuthModalContextType {
    isOpen: boolean
    mode: AuthMode
    redirectUrl: string | null
    openAuthModal: (mode: AuthMode, redirectUrl?: string) => void
    closeAuthModal: () => void
    switchMode: () => void
}

const AuthModalContext = createContext<AuthModalContextType | null>(null)

export function AuthModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [mode, setMode] = useState<AuthMode>('sign-in')
    const [redirectUrl, setRedirectUrl] = useState<string | null>(null)

    const openAuthModal = useCallback((newMode: AuthMode, newRedirectUrl?: string) => {
        setMode(newMode)
        setRedirectUrl(newRedirectUrl || null)
        setIsOpen(true)

        // Store redirect URL for OAuth callbacks
        if (typeof window !== 'undefined' && newRedirectUrl) {
            localStorage.setItem('cove_redirect_url', newRedirectUrl)
        }
    }, [])

    const closeAuthModal = useCallback(() => {
        setIsOpen(false)
        // Don't clear redirect URL here - OAuth may need it
    }, [])

    const switchMode = useCallback(() => {
        setMode(prev => prev === 'sign-in' ? 'sign-up' : 'sign-in')
    }, [])

    return (
        <AuthModalContext.Provider
            value={{
                isOpen,
                mode,
                redirectUrl,
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
    if (!context) {
        throw new Error('useAuthModal must be used within AuthModalProvider')
    }
    return context
}
