'use client'

import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs'
import Link from 'next/link'
import { Menu, ShoppingCart } from 'lucide-react'

import { syncClerkUserToBackendClientSide } from '@/src/lib/syncUser'
import SearchBar from './SearchBar'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, isSignedIn } = useUser()
  const { getToken, isLoaded: isAuthLoaded } = useAuth()

  // Sync user to backend after login
  useEffect(() => {
    if (!isAuthLoaded) return

    const synced = sessionStorage.getItem('user-synced')

    if (isSignedIn && !synced) {
      const sync = async () => {
        const token = await getToken()
        if (token) {
          console.log('[DEBUG] Got token:', token)
          await syncClerkUserToBackendClientSide(token)
          sessionStorage.setItem('user-synced', 'true')
        } else {
          console.warn('[DEBUG] No token available yet')
        }
      }
      sync()
    }
  }, [isSignedIn, isAuthLoaded, getToken])

  // Clear sync flag on logout
  useEffect(() => {
    if (!isSignedIn && isAuthLoaded) {
      sessionStorage.removeItem('user-synced')
    }
  }, [isSignedIn, isAuthLoaded])

  return (
    <header className="fixed top-0 left-0 w-full z-50 backdrop-blur bg-white/60 border-b border-gray-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="text-xl font-bold tracking-widest text-gray-900 uppercase">
          COVE
        </Link>

        {/* Center: Search */}
        <div className="hidden md:flex mx-6 relative pb-10">
          <SearchBar />
        </div>

        {/* Right: Controls */}
        <div className="hidden md:flex items-center gap-4 text-sm text-gray-800">
          {/* Language */}
          <span className="cursor-pointer hover:text-black transition">EN</span>

          {/* Theme toggle (you had this import) */}
          <ThemeToggle />

          {/* New: My Orders link (works for signed-in & guests) */}
          <Link href="/orders" className="hover:text-black transition">
            My Orders
          </Link>

          {/* Auth */}
          <SignedOut>
            <SignInButton mode="modal">
              <button className="hover:text-black transition">Sign In</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="hover:text-black transition">Sign Up</button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <Link href="/dashboard" className="hover:text-black transition">
              {user?.username || user?.lastName || 'Dashboard'}
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          {/* Cart now navigates to /checkout */}
          <Link
            href="/checkout"
            className="inline-flex items-center hover:text-black transition"
            aria-label="Cart"
          >
            <ShoppingCart className="w-5 h-5" />
          </Link>

          {/* You had this link */}
          <Link href="/animation" className="text-sm font-medium hover:underline transition-colors">
            Animated Card
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-4 pt-2 space-y-2 bg-white border-t border-gray-200 text-sm">
          <input
            type="text"
            placeholder="Search..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none"
          />

          <div className="flex flex-col gap-2">
            <span className="cursor-pointer">EN</span>

            {/* Theme toggle in mobile menu too */}
            <ThemeToggle />

            {/* My Orders (new) */}
            <Link href="/orders" onClick={() => setMenuOpen(false)}>
              My Orders
            </Link>

            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-left w-full">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="text-left w-full">Sign Up</button>
              </SignUpButton>
            </SignedOut>

            <SignedIn>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                {user?.username || user?.lastName || 'Dashboard'}
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            {/* Cart → /checkout */}
            <Link href="/checkout" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
              <ShoppingCart className="w-5 h-5" />
              <span>Cart</span>
            </Link>

            {/* Your existing link */}
            <Link href="/animation" onClick={() => setMenuOpen(false)}>
              Animated Card
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
