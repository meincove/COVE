'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

export default function PartnerOnboardingPage() {
    const containerRef = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    })

    // Parallax transforms
    const y1 = useTransform(scrollYProgress, [0, 1], [0, -100])
    const y2 = useTransform(scrollYProgress, [0, 1], [0, -200])
    const opacity1 = useTransform(scrollYProgress, [0, 0.5], [1, 0])
    const opacity2 = useTransform(scrollYProgress, [0.3, 0.7], [0, 1])

    return (
        <div ref={containerRef} className="bg-gradient-to-br from-green-50 via-white to-slate-50">
            {/* Hero Section */}
            <section className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
                <motion.div
                    style={{ y: y1, opacity: opacity1 }}
                    className="text-center z-10 max-w-4xl"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-50 to-slate-50 rounded-full mb-8"
                    >
                        <span className="text-2xl">📦</span>
                        <span className="text-sm font-semibold text-green-700">COVE PLATFORM</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-green-600 via-slate-800 to-black bg-clip-text text-transparent mb-6"
                    >
                        Grow Your Brand
                        <br />
                        with COVE
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-xl md:text-2xl text-slate-600 mb-12 max-w-2xl mx-auto"
                    >
                        Join premium brands selling on our AI-powered platform. Reach engaged shoppers, manage products effortlessly, and grow your business.
                    </motion.p>

                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="px-8 py-4 bg-gradient-to-r from-green-600 to-slate-900 text-white rounded-xl font-semibold text-lg shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all duration-300"
                    >
                        Start Your Application →
                    </motion.button>
                </motion.div>

                {/* Background Elements */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-20 left-10 w-64 h-64 bg-green-300 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-20 right-10 w-64 h-64 bg-slate-300 rounded-full blur-3xl"></div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="min-h-screen flex items-center justify-center px-4 py-20">
                <motion.div
                    style={{ opacity: opacity2 }}
                    className="max-w-6xl w-full"
                >
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-green-600 to-slate-900 bg-clip-text text-transparent"
                    >
                        How It Works
                    </motion.h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                step: "01",
                                title: "Apply",
                                description: "Fill out a simple application form with your brand details and product information.",
                                icon: "📝"
                            },
                            {
                                step: "02",
                                title: "Get Approved",
                                description: "Our team reviews your application within 24-48 hours and provides feedback.",
                                icon: "✅"
                            },
                            {
                                step: "03",
                                title: "Start Selling",
                                description: "Upload your products, set your prices, and start reaching premium shoppers.",
                                icon: "🚀"
                            }
                        ].map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: idx * 0.2 }}
                                className="relative p-8 bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-shadow duration-300"
                            >
                                <div className="text-6xl mb-4">{item.icon}</div>
                                <div className="text-sm font-bold text-green-600 mb-2">{item.step}</div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-3">{item.title}</h3>
                                <p className="text-slate-600">{item.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* Benefits Section */}
            <section className="min-h-screen flex items-center justify-center px-4 py-20 bg-gradient-to-br from-slate-50 to-white">
                <div className="max-w-6xl w-full">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-green-600 to-slate-900 bg-clip-text text-transparent"
                    >
                        Why Partner with COVE?
                    </motion.h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        {[
                            {
                                title: "Reach Premium Shoppers",
                                description: "Access our engaged community of shoppers looking for quality products.",
                                icon: "🎯"
                            },
                            {
                                title: "Easy Product Management",
                                description: "Intuitive dashboard to manage inventory, orders, and analytics.",
                                icon: "📊"
                            },
                            {
                                title: "Marketing Support",
                                description: "Featured placements, email campaigns, and social media promotion.",
                                icon: "📢"
                            },
                            {
                                title: "Analytics & Insights",
                                description: "Track sales, understand your customers, and optimize performance.",
                                icon: "📈"
                            }
                        ].map((benefit, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: idx % 2 === 0 ? -30 : 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: idx * 0.1 }}
                                className="flex gap-4 p-6 bg-white rounded-xl shadow-md border border-slate-100"
                            >
                                <div className="text-4xl">{benefit.icon}</div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">{benefit.title}</h3>
                                    <p className="text-slate-600">{benefit.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="min-h-screen flex items-center justify-center px-4 py-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center max-w-3xl"
                >
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-green-600 to-slate-900 bg-clip-text text-transparent">
                        Ready to Get Started?
                    </h2>
                    <p className="text-xl text-slate-600 mb-12">
                        Join hundreds of brands already selling on COVE. Start your application today.
                    </p>
                    <button className="px-10 py-5 bg-gradient-to-r from-green-600 to-slate-900 text-white rounded-xl font-semibold text-xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all duration-300">
                        Apply Now →
                    </button>
                </motion.div>
            </section>
        </div>
    )
}
