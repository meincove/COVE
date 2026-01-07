"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Check, Sparkles, ChevronLeft, ChevronRight, Star, Zap } from "lucide-react";
import { useCartStore } from "@/src/store/cartStore";
import type { CartItem, CartState } from "@/types/cart";

interface OutfitItem {
    slug: string;
    title: string;
    price: number;
    imageUrl?: string;
    type?: string;
    reason?: string;
    outfit_id?: string;
    color?: string;
    size?: string;
}

interface OutfitModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: OutfitItem[];
    budgetMax?: number;
}

// Premium spring animation configs
const springConfig = { type: "spring" as const, damping: 20, stiffness: 300 };
const softSpring = { type: "spring" as const, damping: 30, stiffness: 200 };

// Staggered children animation
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: "spring" as const, damping: 20, stiffness: 300 }
    }
};

/**
 * OutfitModal - Premium outfit display with stunning animations
 */
export default function OutfitModal({
    isOpen,
    onClose,
    items,
    budgetMax = 500
}: OutfitModalProps) {
    // Group items by outfit_id
    const outfits: Record<string, OutfitItem[]> = {};
    items.forEach(item => {
        const oid = item.outfit_id || "outfit_1";
        if (!outfits[oid]) outfits[oid] = [];
        outfits[oid].push(item);
    });

    const outfitIds = Object.keys(outfits).sort();
    const [activeOutfitIndex, setActiveOutfitIndex] = useState(0);
    const [direction, setDirection] = useState(0); // For slide direction
    const activeOutfitId = outfitIds[activeOutfitIndex] || "outfit_1";
    const activeItems = outfits[activeOutfitId] || [];

    const totalCost = activeItems.reduce((sum, i) => sum + (i.price || 0), 0);
    const isWithinBudget = totalCost <= budgetMax;
    const savings = budgetMax - totalCost;

    const handlePrevOutfit = () => {
        setDirection(-1);
        setActiveOutfitIndex(prev => Math.max(0, prev - 1));
    };

    const handleNextOutfit = () => {
        setDirection(1);
        setActiveOutfitIndex(prev => Math.min(outfitIds.length - 1, prev + 1));
    };

    const addItem = useCartStore((state: CartState) => state.addItem);

    const handleAddToCart = async () => {
        let addedCount = 0;

        for (const item of activeItems) {
            // Construct a valid CartItem from the outfit item
            // Note: We are mocking some fields (variantId, size) for now as the agent doesn't return them yet.
            const cartItem = {
                productId: item.slug || `prod_${Math.random()}`,
                variantId: `${item.slug}_${item.color || 'default'}`, // Mock variant ID
                name: item.title,
                type: item.type || 'product',
                tier: 'standard', // Mock tier
                size: 'M', // Default size for outfit builder interactions
                color: item.color || 'Multi',
                colorName: item.color || 'Multi',
                quantity: 1,
                price: item.price || 0,
                imageUrl: item.imageUrl || '',
                material: 'Cotton', // Mock material
            };

            await addItem(cartItem);
            addedCount++;
        }

        // Simple feedback (could be replaced with a proper Toast)
        if (addedCount > 0) {
            // Flash success state or close
            const originalText = document.getElementById("add-cart-text");
            if (originalText) originalText.innerText = "Added to Cart!";
            setTimeout(() => {
                onClose();
            }, 800);
        }
    };

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <>
                    {/* Backdrop with blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[997] bg-black/30 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Main Modal */}
                    <motion.div
                        initial={{ opacity: 0, x: -100, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -100, scale: 0.9 }}
                        transition={springConfig}
                        className="fixed z-[998] bottom-6 right-[calc(680px+2rem)] w-[460px] h-[calc(100vh-8rem)] max-h-[720px] rounded-3xl overflow-hidden"
                        style={{
                            background: "linear-gradient(135deg, rgba(15,15,20,0.98) 0%, rgba(10,10,15,0.99) 100%)",
                            boxShadow: "0 25px 80px -12px rgba(168, 85, 247, 0.4), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1)"
                        }}
                    >
                        {/* Animated gradient background */}
                        <div className="absolute inset-0 overflow-hidden">
                            <motion.div
                                animate={{
                                    background: [
                                        "radial-gradient(circle at 0% 0%, rgba(168,85,247,0.15) 0%, transparent 50%)",
                                        "radial-gradient(circle at 100% 100%, rgba(236,72,153,0.15) 0%, transparent 50%)",
                                        "radial-gradient(circle at 0% 100%, rgba(168,85,247,0.15) 0%, transparent 50%)",
                                        "radial-gradient(circle at 0% 0%, rgba(168,85,247,0.15) 0%, transparent 50%)"
                                    ]
                                }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0"
                            />
                        </div>

                        {/* Header */}
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ ...softSpring, delay: 0.1 }}
                            className="relative px-5 py-4 border-b border-white/10"
                            style={{
                                background: "linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(236,72,153,0.2) 100%)",
                                backdropFilter: "blur(20px)"
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <motion.div
                                        animate={{ rotate: [0, 5, -5, 0] }}
                                        transition={{ duration: 4, repeat: Infinity }}
                                        className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shadow-lg shadow-purple-500/30"
                                    >
                                        <Sparkles className="h-5 w-5 text-white" />
                                    </motion.div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                            Your Outfits
                                            <motion.span
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            >
                                                <Zap className="h-4 w-4 text-yellow-400" />
                                            </motion.span>
                                        </h3>
                                        <p className="text-xs text-neutral-400">
                                            {outfitIds.length} curated options
                                        </p>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onClose}
                                    className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center transition-colors border border-white/10"
                                >
                                    <X className="h-4 w-4 text-neutral-400" />
                                </motion.button>
                            </div>

                            {/* Outfit Tabs */}
                            <div className="mt-4 flex items-center gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handlePrevOutfit}
                                    disabled={activeOutfitIndex === 0}
                                    className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-white/10"
                                >
                                    <ChevronLeft className="h-4 w-4 text-white" />
                                </motion.button>

                                <div className="flex-1 flex gap-2 justify-center">
                                    {outfitIds.map((oid, idx) => (
                                        <motion.button
                                            key={oid}
                                            onClick={() => {
                                                setDirection(idx > activeOutfitIndex ? 1 : -1);
                                                setActiveOutfitIndex(idx);
                                            }}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={`
                                                relative px-5 py-2 rounded-xl text-xs font-semibold transition-all overflow-hidden
                                                ${idx === activeOutfitIndex
                                                    ? 'text-white'
                                                    : 'bg-white/5 text-neutral-400 hover:text-white border border-white/10'
                                                }
                                            `}
                                        >
                                            {idx === activeOutfitIndex && (
                                                <motion.div
                                                    layoutId="activeTab"
                                                    className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"
                                                    style={{ borderRadius: 12 }}
                                                    transition={springConfig}
                                                />
                                            )}
                                            <span className="relative z-10 flex items-center gap-1.5">
                                                <Star className="h-3 w-3" />
                                                Look {idx + 1}
                                            </span>
                                        </motion.button>
                                    ))}
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleNextOutfit}
                                    disabled={activeOutfitIndex === outfitIds.length - 1}
                                    className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-white/10"
                                >
                                    <ChevronRight className="h-4 w-4 text-white" />
                                </motion.button>
                            </div>
                        </motion.div>

                        {/* Product Grid with AnimatePresence for tab switching */}
                        <div className="relative h-[calc(100%-280px)] overflow-hidden">
                            <AnimatePresence mode="wait" custom={direction}>
                                <motion.div
                                    key={activeOutfitId}
                                    custom={direction}
                                    initial={{ x: direction * 100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: direction * -100, opacity: 0 }}
                                    transition={softSpring}
                                    className="absolute inset-0 overflow-y-auto p-4"
                                >
                                    <motion.div
                                        variants={containerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="space-y-3"
                                    >
                                        {activeItems.length > 0 ? (
                                            activeItems.map((item, idx) => (
                                                <motion.div
                                                    key={item.slug || idx}
                                                    variants={itemVariants}
                                                    whileHover={{ scale: 1.02, y: -2 }}
                                                    className="group relative flex gap-4 rounded-2xl p-3 transition-all cursor-pointer overflow-hidden"
                                                    style={{
                                                        background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                                                        border: "1px solid rgba(255,255,255,0.08)"
                                                    }}
                                                >
                                                    {/* Hover glow effect */}
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        whileHover={{ opacity: 1 }}
                                                        className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10"
                                                    />

                                                    {/* Image */}
                                                    <motion.div
                                                        whileHover={{ scale: 1.05 }}
                                                        className="relative h-24 w-24 flex-shrink-0 rounded-xl overflow-hidden bg-neutral-800"
                                                    >
                                                        {item.imageUrl ? (
                                                            <img
                                                                src={item.imageUrl}
                                                                alt={item.title}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                                                                <ShoppingBag className="h-8 w-8 text-neutral-600" />
                                                            </div>
                                                        )}
                                                        {/* Shine effect */}
                                                        <motion.div
                                                            initial={{ x: "-100%" }}
                                                            whileHover={{ x: "100%" }}
                                                            transition={{ duration: 0.6 }}
                                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                                        />
                                                    </motion.div>

                                                    {/* Info */}
                                                    <div className="relative flex-1 min-w-0 flex flex-col justify-center">
                                                        <p className="text-sm font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                                                            {item.title}
                                                        </p>
                                                        <p className="text-xs text-neutral-500 capitalize mt-0.5">
                                                            {item.type || "Item"}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-lg font-bold bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
                                                                €{item.price?.toFixed(2) || "0.00"}
                                                            </span>
                                                        </div>
                                                        {item.reason && (
                                                            <p className="text-[10px] text-purple-400/80 mt-1 line-clamp-1">
                                                                ✨ {item.reason}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Check Badge */}
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ ...springConfig, delay: idx * 0.1 + 0.2 }}
                                                        className="relative flex items-start pt-1"
                                                    >
                                                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                                                            <Check className="h-4 w-4 text-white" />
                                                        </div>
                                                    </motion.div>
                                                </motion.div>
                                            ))
                                        ) : (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="h-full flex items-center justify-center text-neutral-500"
                                            >
                                                <div className="text-center">
                                                    <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                                    <p className="text-sm">No items in this outfit</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer - Total & CTA */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ ...softSpring, delay: 0.3 }}
                            className="absolute bottom-0 left-0 right-0 p-5 border-t border-white/10"
                            style={{
                                background: "linear-gradient(to top, rgba(10,10,15,1) 0%, rgba(10,10,15,0.95) 100%)",
                                backdropFilter: "blur(20px)"
                            }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Total</p>
                                    <motion.p
                                        key={totalCost}
                                        initial={{ scale: 1.2, color: "#a855f7" }}
                                        animate={{ scale: 1, color: isWithinBudget ? "#ffffff" : "#f87171" }}
                                        className="text-2xl font-bold"
                                    >
                                        €{totalCost.toFixed(2)}
                                    </motion.p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-neutral-500">{activeItems.length} items</p>
                                    {isWithinBudget ? (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-sm font-medium text-green-400"
                                        >
                                            €{savings.toFixed(0)} under budget ✓
                                        </motion.p>
                                    ) : (
                                        <p className="text-sm font-medium text-red-400">Over budget</p>
                                    )}
                                </div>
                            </div>

                            <motion.button
                                onClick={handleAddToCart}
                                whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -12px rgba(168,85,247,0.5)" }}
                                whileTap={{ scale: 0.98 }}
                                className="relative w-full py-4 rounded-2xl font-semibold text-white overflow-hidden group"
                                style={{
                                    background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #8b5cf6 100%)",
                                    backgroundSize: "200% 100%"
                                }}
                            >
                                {/* Animated gradient */}
                                <motion.div
                                    animate={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0"
                                    style={{
                                        background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #8b5cf6 100%)",
                                        backgroundSize: "200% 100%"
                                    }}
                                />
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    <ShoppingBag className="h-5 w-5" />
                                    Add Complete Look to Cart
                                </span>
                            </motion.button>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
