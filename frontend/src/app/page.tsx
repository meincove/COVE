"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser, useClerk } from '@clerk/nextjs'

export default function WelcomePage() {
  const router = useRouter()
  const { user, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const [hoveredPath, setHoveredPath] = useState<'shop' | 'platform' | null>(null)
  const [showShopOptions, setShowShopOptions] = useState(false)

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
    <div className="relative h-screen w-screen overflow-hidden bg-white">
      {/* Split Background */}
      <div className="absolute inset-0 flex">
        <motion.div
          className="w-1/2 h-full bg-white"
          animate={{
            background: hoveredPath === 'platform'
              ? 'linear-gradient(135deg, #d1fae5 0%, #f0fdf4 50%, #f9fafb 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)'
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
        <motion.div
          className="w-1/2 h-full bg-white"
          animate={{
            background: hoveredPath === 'shop'
              ? 'linear-gradient(135deg, #fef3c7 0%, #dbeafe 50%, #f0f9ff 100%)'
              : 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)'
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      {/* Auth Buttons - Floating Pill */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="fixed top-6 right-6 z-[500] flex items-center gap-3 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-slate-200"
      >
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
      </motion.div>

      {/* Content */}
      <div className="relative h-full w-full flex items-center justify-center px-4 md:px-8 py-4 z-10 overflow-y-auto">
        <div className="w-full max-w-7xl my-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-6 md:mb-8"
          >
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent mb-3 md:mb-4">
              {isSignedIn && user?.firstName
                ? `Hey ${user.firstName}, great to see you!`
                : 'Welcome to COVE'
              }
            </h1>
            <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
              Whether you're here to discover premium products or grow your brand, we've got you covered.
            </p>
          </motion.div>

          {/* Dual Path Cards */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
            {/* COVE PLATFORM Card */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              onMouseEnter={() => setHoveredPath('platform')}
              onMouseLeave={() => setHoveredPath(null)}
              onClick={handlePlatformSelect}
              className={`
                relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border-2 cursor-pointer
                transition-all duration-500 ease-out
                ${hoveredPath === 'platform'
                  ? 'border-green-500 shadow-2xl shadow-green-500/20 scale-[1.02]'
                  : 'border-slate-200 hover:border-green-300 shadow-lg'
                }
              `}
            >
              <div className="p-6 md:p-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-slate-50 rounded-full mb-4 md:mb-6">
                  <span className="text-2xl">📦</span>
                  <span className="text-sm font-semibold text-green-700">For Brands</span>
                </div>

                <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-green-600 via-slate-800 to-black bg-clip-text text-transparent mb-2 md:mb-3">
                  COVE PLATFORM
                </h2>
                <p className="text-base md:text-lg text-slate-600 mb-6 md:mb-8">
                  Sell Your Products
                </p>

                <div className="relative h-32 md:h-48 mb-6 md:mb-8 rounded-2xl bg-gradient-to-br from-green-50 via-white to-slate-50 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-green-300 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-slate-300 rounded-full blur-3xl"></div>
                  </div>
                  <div className="relative">
                    <div className="w-36 h-24 md:w-48 md:h-32 bg-white rounded-xl shadow-lg border border-slate-200 p-3 md:p-4">
                      <div className="flex items-center justify-between mb-2 md:mb-3">
                        <div className="h-2 w-12 md:w-16 bg-green-200 rounded"></div>
                        <div className="h-2 w-6 md:w-8 bg-slate-200 rounded"></div>
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                        <div className="h-1.5 w-full bg-slate-100 rounded"></div>
                        <div className="h-1.5 w-3/4 bg-slate-100 rounded"></div>
                        <div className="h-1.5 w-5/6 bg-slate-100 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                  {[
                    'Reach Premium Shoppers',
                    'Easy Product Management',
                    'Analytics & Insights',
                    'Marketing Support'
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm md:text-base text-slate-700">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`
                    w-full py-3 md:py-4 px-6 rounded-xl font-semibold text-base md:text-lg
                    transition-all duration-300
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
                  className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-slate-500/5 pointer-events-none"
                />
              )}
            </motion.div>

            {/* COVE SHOP Card with Dual Buttons */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              onMouseEnter={() => setHoveredPath('shop')}
              onMouseLeave={() => setHoveredPath(null)}
              className={`
                relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border-2
                transition-all duration-500 ease-out
                ${hoveredPath === 'shop'
                  ? 'border-yellow-400 shadow-2xl shadow-yellow-500/20 scale-[1.02]'
                  : 'border-slate-200 hover:border-yellow-300 shadow-lg'
                }
              `}
            >
              <div className="p-6 md:p-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-50 to-blue-50 rounded-full mb-4 md:mb-6">
                  <span className="text-2xl">🛍️</span>
                  <span className="text-sm font-semibold bg-gradient-to-r from-yellow-600 to-blue-600 bg-clip-text text-transparent">
                    For Shoppers
                  </span>
                </div>

                <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-yellow-600 via-blue-500 to-blue-600 bg-clip-text text-transparent mb-2 md:mb-3">
                  COVE SHOP
                </h2>
                <p className="text-base md:text-lg text-slate-600 mb-6 md:mb-8">
                  Browse & Buy Premium Products
                </p>

                <div className="relative h-32 md:h-48 mb-6 md:mb-8 rounded-2xl bg-gradient-to-br from-yellow-100 via-blue-100 to-blue-50 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-300 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-300 rounded-full blur-3xl"></div>
                  </div>
                  <div className="relative grid grid-cols-3 gap-2 md:gap-3 p-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="w-12 h-16 md:w-16 md:h-20 bg-white rounded-lg shadow-sm border border-slate-200"
                      />
                    ))}
                  </div>
                </div>

                <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                  {[
                    'AI-Powered Search & Discovery',
                    'Curated Premium Collections',
                    'Secure & Fast Checkout',
                    'Personalized Recommendations'
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm md:text-base text-slate-700">
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
                    className="py-3 md:py-4 px-4 rounded-xl font-semibold text-sm md:text-base bg-gradient-to-r from-yellow-400 to-blue-400 text-white hover:from-yellow-500 hover:to-blue-500 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    Start Browsing
                  </button>
                  <button
                    onClick={handleCurateShop}
                    className="py-3 md:py-4 px-4 rounded-xl font-semibold text-sm md:text-base bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
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
                  className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-blue-500/5 pointer-events-none"
                />
              )}
            </motion.div>
          </div>

          {/* Skip Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center"
          >
            <button
              onClick={handleBrowseShop}
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors duration-200 underline-offset-4 hover:underline text-sm md:text-base"
            >
              Just Browsing? Skip to Shop →
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
