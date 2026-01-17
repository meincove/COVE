"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

// Mock data for "Complete the Look"
// Ideally this comes from an API based on tags/categories
const RELATED_ITEMS = [
    { title: "Oversized Denim Jacket", price: 189.00, img: "https://images.pexels.com/photos/2043590/pexels-photo-2043590.jpeg?auto=compress&cs=tinysrgb&h=650&w=940" },
    { title: "Premium Cotton Tee", price: 45.00, img: "https://images.pexels.com/photos/428338/pexels-photo-428338.jpeg?auto=compress&cs=tinysrgb&h=650&w=940" },
    { title: "Leather Chelsea Boots", price: 220.00, img: "https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&h=650&w=940" },
]

export default function RelatedProducts() {
    return (
        <section className="py-24 border-t border-gray-100">
            <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-12">
                <div className="flex justify-between items-end">
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Complete the Look</h2>
                    <button className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:text-black/60 transition-colors">
                        View All <ArrowRight size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {RELATED_ITEMS.map((item, i) => (
                        <div key={i} className="group cursor-pointer space-y-4">
                            <div className="overflow-hidden rounded-xl aspect-[4/5] bg-gray-100 relative">
                                <motion.img
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ duration: 0.4 }}
                                    src={item.img}
                                    className="w-full h-full object-cover"
                                    alt={item.title}
                                />
                                <div className="absolute bottom-4 left-4">
                                    <button className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-full opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                        Quick Add
                                    </button>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg uppercase tracking-tight">{item.title}</h3>
                                <p className="text-black/60">€{item.price.toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
