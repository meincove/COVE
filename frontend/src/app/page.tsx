"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useUser, useClerk } from '@clerk/nextjs'

export default function WelcomePage() {
  const router = useRouter()
  const { user, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const [hoveredPath, setHoveredPath] = useState<'shop' | 'platform' | null>(null)

  const handlePlatformSelect = () => {
    localStorage.setItem('cove_selected_path', 'platform')
    localStorage.setItem('cove_path_timestamp', Date.now().toString())
    router.push('/partner-onboarding')
  }

  const handleBrowseShop = () => {
    localStorage.setItem('cove_selected_path', 'shop')
    localStorage.setItem('cove_shop_mode', 'browse')
    router.push('/shop')
  }

  const handleCurateShop = () => {
    localStorage.setItem('cove_selected_path', 'shop')
    localStorage.setItem('cove_shop_mode', 'curate')
    router.push('/shop/curate')
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col overflow-hidden">
      {/* HEADER DIV - 20% - GREEN BACKGROUND */}
      <div className="relative z-10 h-[20vh] flex items-center justify-center px-8 bg-gradient-to-br from-green-400 via-green-500 to-emerald-600">
        <div className="text-center max-w-4xl">
          <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">
            {isSignedIn && user?.firstName
              ? `Hey ${user.firstName}, great to see you!`
              : 'Welcome to COVE'
            }
          </h1>
          <p className="text-xl text-white/90 drop-shadow-md">
            Whether you're here to discover premium products or grow your brand, we've got you covered.
          </p>
        </div>

        {/* Auth Buttons - Top Right */}
        <div className="absolute top-6 right-6 flex items-center gap-3 bg-white/95 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-white/50">
          {isSignedIn ? (
            <>
              <a
                href="/dashboard"
                className="text-sm font-semibold text-slate-700 hover:text-purple-600 transition-colors"
              >
                Dashboard
              </a>
              <div className="w-px h-4 bg-slate-300"></div>
              <button
                onClick={async () => {
                  await signOut()
                  window.location.reload()
                }}
                className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <a
                href="/sign-in"
                className="text-sm font-semibold text-slate-700 hover:text-purple-600 transition-colors"
              >
                Sign In
              </a>
              <div className="w-px h-4 bg-slate-300"></div>
              <a
                href="/sign-up"
                className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                Sign Up
              </a>
            </>
          )}
        </div>
      </div>

      {/* MIDDLE DIV - 60% - CARDS WITH ANIMATED BACKGROUND */}
      <div className="relative z-10 h-[60vh] flex items-center justify-center px-8 py-6">
        {/* Split Background Animation */}
        <div className="absolute inset-0 flex pointer-events-none">
          <motion.div
            className="w-1/2 h-full"
            animate={{
              background: hoveredPath === 'platform'
                ? 'linear-gradient(135deg, #d1fae5 0%, #f0fdf4 50%, #f9fafb 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)'
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
          <motion.div
            className="w-1/2 h-full"
            animate={{
              background: hoveredPath === 'shop'
                ? 'linear-gradient(135deg, #fef3c7 0%, #dbeafe 50%, #f0f9ff 100%)'
                : 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)'
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>

        {/* Cards Container */}
        <div className="relative w-full max-w-7xl h-full">
          <div className="grid md:grid-cols-2 gap-8 h-full">
            {/* Platform Card */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              onMouseEnter={() => setHoveredPath('platform')}
              onMouseLeave={() => setHoveredPath(null)}
              onClick={handlePlatformSelect}
              className={`
                relative rounded-3xl bg-white/90 backdrop-blur-sm border-2 cursor-pointer
                transition-all duration-500 h-full flex flex-col overflow-hidden
                ${hoveredPath === 'platform'
                  ? 'border-green-500 shadow-2xl shadow-green-500/20 scale-[1.02]'
                  : 'border-slate-200 hover:border-green-300 shadow-lg'
                }
              `}
            >
              <div className="p-10 h-full flex flex-col">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-slate-50 rounded-full mb-6 w-fit">
                  <span className="text-2xl">📦</span>
                  <span className="text-sm font-semibold text-green-700">For Brands</span>
                </div>

                <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-slate-800 to-black bg-clip-text text-transparent mb-3">
                  COVE PLATFORM
                </h2>
                <p className="text-lg text-slate-600 mb-8">Sell Your Products</p>

                <div className="relative h-48 mb-8 rounded-2xl bg-gradient-to-br from-green-50 via-white to-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-green-300 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-slate-300 rounded-full blur-3xl"></div>
                  </div>
                  <div className="relative w-48 h-32 bg-white rounded-xl shadow-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-2 w-16 bg-green-200 rounded"></div>
                      <div className="h-2 w-8 bg-slate-200 rounded"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-1.5 w-full bg-slate-100 rounded"></div>
                      <div className="h-1.5 w-3/4 bg-slate-100 rounded"></div>
                      <div className="h-1.5 w-5/6 bg-slate-100 rounded"></div>
                    </div>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {['Reach Premium Shoppers', 'Easy Product Management', 'Analytics & Insights', 'Marketing Support'].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-base text-slate-700">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`
                    w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300
                    ${hoveredPath === 'platform'
                      ? 'bg-gradient-to-r from-green-600 to-slate-900 text-white shadow-lg shadow-green-500/30'
                      : 'bg-gradient-to-r from-green-500 to-slate-700 text-white hover:from-green-600 hover:to-slate-800'
                    }
                  `}
                >
                  Apply to Sell →
                </button>
              </div>
              {hoveredPath === 'platform' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-slate-500/5 pointer-events-none rounded-3xl"
                />
              )}
            </motion.div>

            {/* Shop Card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              onMouseEnter={() => setHoveredPath('shop')}
              onMouseLeave={() => setHoveredPath(null)}
              className={`
                relative rounded-3xl bg-white/90 backdrop-blur-sm border-2
                transition-all duration-500 h-full flex flex-col overflow-hidden
                ${hoveredPath === 'shop'
                  ? 'border-yellow-400 shadow-2xl shadow-yellow-500/20 scale-[1.02]'
                  : 'border-slate-200 hover:border-yellow-300 shadow-lg'
                }
              `}
            >
              <div className="p-10 h-full flex flex-col">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-50 to-blue-50 rounded-full mb-6 w-fit">
                  <span className="text-2xl">🛍️</span>
                  <span className="text-sm font-semibold bg-gradient-to-r from-yellow-600 to-blue-600 bg-clip-text text-transparent">
                    For Shoppers
                  </span>
                </div>

                <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 via-blue-500 to-blue-600 bg-clip-text text-transparent mb-3">
                  COVE SHOP
                </h2>
                <p className="text-lg text-slate-600 mb-8">Browse & Buy Premium Products</p>

                <div className="relative h-48 mb-8 rounded-2xl bg-gradient-to-br from-yellow-100 via-blue-100 to-blue-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-300 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-300 rounded-full blur-3xl"></div>
                  </div>
                  <div className="relative grid grid-cols-3 gap-3 p-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="w-16 h-20 bg-white rounded-lg shadow-sm border border-slate-200" />
                    ))}
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {['AI-Powered Search & Discovery', 'Curated Premium Collections', 'Secure & Fast Checkout', 'Personalized Recommendations'].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-base text-slate-700">
                      <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Dual Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleBrowseShop}
                    className="py-4 px-4 rounded-xl font-semibold text-base bg-gradient-to-r from-yellow-400 to-blue-400 text-white hover:from-yellow-500 hover:to-blue-500 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    Start Browsing
                  </button>
                  <button
                    onClick={handleCurateShop}
                    className="py-4 px-4 rounded-xl font-semibold text-base bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>Curate My Shop</span>
                    <span className="text-lg">🪄</span>
                  </button>
                </div>
              </div>
              {hoveredPath === 'shop' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-blue-500/5 pointer-events-none rounded-3xl"
                />
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* FOOTER DIV - 20% - BLUE BACKGROUND */}
      <div className="relative z-10 h-[20vh] flex flex-col items-center justify-center gap-4 px-8 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600">
        <button
          onClick={handleBrowseShop}
          className="text-white hover:text-white/80 font-medium transition-colors underline-offset-4 hover:underline text-base drop-shadow-md"
        >
          Just Browsing? Skip to Shop →
        </button>
      </div>
    </div>
  )
}
