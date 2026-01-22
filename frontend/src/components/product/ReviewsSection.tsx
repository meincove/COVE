"use client"

import { Star } from "lucide-react"
import { motion } from "framer-motion"

export default function ReviewsSection() {
    return (
        <section className="py-24 border-t border-gray-100">
            <div className="max-w-[2400px] mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Summary Column */}
                    <div className="lg:col-span-4 space-y-6">
                        <h2 className="text-3xl font-black uppercase tracking-tighter">Reviews (128)</h2>
                        <div className="flex items-baseline gap-4">
                            <span className="text-6xl font-black">4.9</span>
                            <div className="flex text-yellow-500">
                                {[1, 2, 3, 4, 5].map(i => <Star key={i} fill="currentColor" size={24} />)}
                            </div>
                        </div>
                        <p className="text-black/60 font-medium">
                            100% of customers recommend this product.
                        </p>
                        <button className="px-8 py-4 bg-black text-white rounded-full font-bold uppercase tracking-widest text-sm hover:bg-gray-800 transition-colors">
                            Write a Review
                        </button>
                    </div>

                    {/* Reviews Grid */}
                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { name: "Alex M.", title: "Perfect fit", text: "The Italian Cotton creates such a unique silhouette. I've been wearing these nonstop." },
                            { name: "Sarah K.", title: "Worth every penny", text: "Quality is unmatched. The fabric feels incredible against the skin." },
                            { name: "Jordan P.", title: "New favorite", text: "Exactly what I was looking for. Fits true to size and the color is vibrant." },
                            { name: "Casey L.", title: "Stunning design", text: "The architectural cut is amazing. Getting compliments everywhere I go." }
                        ].map((review, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-8 bg-gray-50 rounded-2xl space-y-4"
                            >
                                <div className="flex text-yellow-500">
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} fill="currentColor" size={16} />)}
                                </div>
                                <h3 className="font-bold text-lg">{review.title}</h3>
                                <p className="text-black/70 leading-relaxed">"{review.text}"</p>
                                <p className="text-xs font-bold uppercase tracking-widest text-black/40 pt-2">{review.name} — Verified Buyer</p>
                            </motion.div>
                        ))}
                    </div>

                </div>
            </div>
        </section>
    )
}
