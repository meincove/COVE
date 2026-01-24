"use client"

import { UiProduct, resolveImgPath } from "@/lib/catalog/shared"
import { motion } from "framer-motion"

type Props = {
    product: UiProduct
}

export default function ProductGridCard({ product }: Props) {
    return (
        <motion.div
            className="group relative flex flex-col gap-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
        >
            {/* Image Container */}
            <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-gray-100 relative">
                <img
                    src={resolveImgPath(product.imageSrc)}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Overlay / Quick Actions */}
                <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button className="w-full rounded-full bg-white/90 backdrop-blur py-3 text-xs font-bold uppercase tracking-widest text-black shadow-lg hover:bg-white transition-colors">
                        Quick View
                    </button>
                </div>

                {/* Badge */}
                {product.badge && (
                    <div className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold tracking-widest uppercase">
                        {product.badge}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex flex-col px-1">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <h3 className="text-sm font-semibold text-black leading-tight mb-1">{product.name}</h3>
                        <p className="text-xs text-black/50">{product.brandId || "COVE"}</p>
                    </div>
                    <span className="text-sm font-medium text-black">€{product.price}</span>
                </div>
            </div>
        </motion.div>
    )
}
