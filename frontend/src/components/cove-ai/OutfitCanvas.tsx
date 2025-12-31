"use client";

import { useLayoutStore } from "@/src/store/layoutStore";
import { useCartStore } from "@/src/store/cartStore";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Sparkles, Check, Heart, Zap } from "lucide-react";
import { AgentItem } from "@/types/agent";
import { useState } from "react";
import { CartItem } from "@/types/cart";
import Toast, { ToastType } from "./Toast";

// --- Variants --- //
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.3
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.85, rotateX: -15 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15
        }
    }
};

// --- Sortable Item Component --- //
function SortableItem(props: { item: AgentItem; id: string; index: number }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
    };

    // Gradient colors based on item index
    const gradients = [
        "from-purple-500/20 to-pink-500/20",
        "from-blue-500/20 to-cyan-500/20",
        "from-amber-500/20 to-orange-500/20",
        "from-emerald-500/20 to-teal-500/20",
    ];
    const gradient = gradients[props.index % gradients.length];

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            variants={itemVariants}
            {...attributes}
            {...listeners}
            className={`
                group relative rounded-3xl overflow-hidden
                cursor-grab active:cursor-grabbing
                ${isDragging ? 'opacity-50 scale-105 shadow-2xl ring-2 ring-purple-500/50' : ''}
            `}
            layoutId={props.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Glass Card Background */}
            <div className={`
                absolute inset-0 bg-gradient-to-br ${gradient}
                backdrop-blur-xl border border-white/10
                transition-all duration-500 group-hover:border-white/20
            `} />

            {/* Animated Glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur-xl opacity-30" />
            </div>

            {/* Content */}
            <div className="relative p-4">
                {/* Sparkle Badge */}
                <motion.div
                    className="absolute -top-1 -right-1 z-10 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full p-1.5 shadow-lg"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5 + props.index * 0.1, type: "spring" }}
                >
                    <Sparkles className="h-3 w-3 text-white" />
                </motion.div>

                {/* Image */}
                <div className="aspect-[3/4] rounded-2xl bg-black/30 mb-4 overflow-hidden relative pointer-events-none ring-1 ring-white/10">
                    {props.item.imageUrl ? (
                        <>
                            <img
                                src={props.item.imageUrl}
                                alt={props.item.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                            <ShoppingBag className="h-12 w-12 text-neutral-600" />
                        </div>
                    )}

                    {/* Quick Actions (on hover) */}
                    <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                        <button className="flex-1 py-2 bg-white/90 backdrop-blur-sm rounded-xl text-xs font-semibold text-neutral-900 hover:bg-white transition-colors">
                            View Details
                        </button>
                        <button className="p-2 bg-white/90 backdrop-blur-sm rounded-xl hover:bg-white transition-colors">
                            <Heart className="h-4 w-4 text-pink-500" />
                        </button>
                    </div>
                </div>

                {/* Info */}
                <div className="pointer-events-none space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium capitalize border border-purple-500/30">
                            {props.item.type || "Product"}
                        </span>
                        {props.item.tier && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium capitalize border border-amber-500/30">
                                {props.item.tier}
                            </span>
                        )}
                    </div>
                    <h3 className="font-semibold text-white line-clamp-1 text-base">{props.item.title}</h3>
                    <div className="flex items-center justify-between">
                        <p className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            {typeof props.item.price === 'number'
                                ? `€${props.item.price.toFixed(2)}`
                                : props.item.price || '€0.00'}
                        </p>
                        {props.item.color && (
                            <span className="text-xs text-neutral-400 capitalize">{props.item.color}</span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// --- Main Canvas Component --- //
export default function OutfitCanvas() {
    const { generatedOutfit, closeCanvas, reorderOutfit, setGeneratedOutfit } = useLayoutStore();
    const { addItem } = useCartStore();
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const dragSensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handle external drop from AgenticOutfitBuilder
    const handleExternalDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        try {
            const data = e.dataTransfer.getData('application/json');
            if (!data) return;

            const product = JSON.parse(data);
            console.log('📦 Dropped product:', product);

            // Add to outfit if not already there
            const currentOutfit = generatedOutfit || [];
            const alreadyExists = currentOutfit.some(item => item.slug === product.slug);

            if (alreadyExists) {
                setToast({ message: 'This item is already in your look!', type: 'warning' as ToastType });
                return;
            }

            // Convert to AgentItem format
            const newItem = {
                title: product.title,
                price: product.price,
                imageUrl: product.imageUrl,
                slug: product.slug,
                type: product.type,
                color: product.color,
                tier: product.tier || '',
                url: `/product/${product.slug}`,
            };

            setGeneratedOutfit([...currentOutfit, newItem]);
            setToast({ message: `Added ${product.title} to your look!`, type: 'success' });
        } catch (err) {
            console.error('Drop error:', err);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only set false if leaving the container entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
        }
    };

    // Calculate total price
    const totalPrice = generatedOutfit?.reduce((sum, item) => {
        const price = typeof item.price === 'number' ? item.price : 0;
        return sum + price;
    }, 0) || 0;

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (active.id !== over?.id && generatedOutfit) {
            const oldIndex = generatedOutfit.findIndex((item) => (item.slug || item.title) === active.id);
            const newIndex = generatedOutfit.findIndex((item) => (item.slug || item.title) === over?.id);

            const newOrder = arrayMove(generatedOutfit, oldIndex, newIndex);
            reorderOutfit(newOrder);
        }
    }

    async function handleShopAll() {
        if (!generatedOutfit || isAdding) return;
        setIsAdding(true);

        let addedCount = 0;
        for (const item of generatedOutfit) {
            if (!item.variantId) continue;

            const cartItem: CartItem = {
                productId: item.slug,
                variantId: item.variantId,
                name: item.title,
                price: item.price || 0,
                quantity: 1,
                size: item.size || "M",
                color: item.color || "Default",
                colorName: item.color || "Default",
                imageUrl: item.imageUrl || "",
                type: item.type || "product",
                tier: item.tier || "standard",
                material: "unknown"
            };
            await addItem(cartItem);
            addedCount++;
        }

        setIsAdding(false);
        if (addedCount > 0) {
            setToast({ message: `🛒 Added ${addedCount} items to cart!`, type: 'success' });
        } else {
            setToast({ message: "Could not add items (missing variants)", type: 'error' });
        }
    }

    if (!generatedOutfit || generatedOutfit.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-950 to-black">
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full" />
                        <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-purple-400 relative" />
                    </div>
                    <p className="text-neutral-400 text-lg">Your outfit canvas is empty</p>
                    <p className="text-neutral-600 text-sm mt-2">Ask me to build you an outfit!</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div
            className={`h-full w-full relative overflow-hidden transition-all duration-300 ${isDragOver ? 'ring-4 ring-purple-500/50 ring-inset' : ''
                }`}
            onDrop={handleExternalDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            {/* Drop Zone Indicator */}
            {isDragOver && (
                <div className="absolute inset-0 z-50 bg-purple-500/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="bg-purple-600/90 text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 shadow-2xl">
                        <ShoppingBag className="h-5 w-5" />
                        Drop to add to your look
                    </div>
                </div>
            )}
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-purple-950/30 to-black" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent" />

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
                        initial={{
                            x: Math.random() * 100 + "%",
                            y: "100%",
                            opacity: 0
                        }}
                        animate={{
                            y: "-10%",
                            opacity: [0, 1, 0],
                            scale: [0, 1.5, 0]
                        }}
                        transition={{
                            duration: 8 + Math.random() * 4,
                            repeat: Infinity,
                            delay: i * 1.5,
                            ease: "easeOut"
                        }}
                    />
                ))}
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Content */}
            <div className="relative z-10 h-full overflow-y-auto p-6 lg:p-8">
                {/* Header */}
                <motion.div
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sticky top-0 z-20 
                        bg-black/40 backdrop-blur-2xl p-5 rounded-3xl border border-white/10 shadow-2xl"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div>
                        <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent flex items-center gap-3">
                            <motion.div
                                animate={{ rotate: [0, 15, -15, 0] }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                            >
                                <Sparkles className="h-7 w-7 text-purple-400" />
                            </motion.div>
                            Your Curated Look
                        </h2>
                        <p className="text-neutral-400 text-sm mt-1">
                            {generatedOutfit.length} items • Drag to reorder
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {/* Total Price */}
                        <div className="flex-1 sm:flex-none px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-xs text-neutral-500">Total</p>
                            <p className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                €{totalPrice.toFixed(2)}
                            </p>
                        </div>

                        {/* Shop All Button */}
                        <motion.button
                            onClick={handleShopAll}
                            disabled={isAdding}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm
                                bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500
                                hover:from-purple-500 hover:via-pink-500 hover:to-orange-400
                                text-white shadow-lg shadow-purple-500/25
                                transition-all duration-300
                                disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isAdding ? (
                                <>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Zap className="h-4 w-4" />
                                    </motion.div>
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <ShoppingBag className="h-4 w-4" />
                                    Shop This Look
                                </>
                            )}
                        </motion.button>

                        <button
                            onClick={closeCanvas}
                            className="p-3 hover:bg-white/10 rounded-2xl transition-colors border border-white/10"
                        >
                            <X className="h-5 w-5 text-neutral-400" />
                        </button>
                    </div>
                </motion.div>

                {/* Grid */}
                <DndContext
                    sensors={dragSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={generatedOutfit.map(i => i.slug || i.title)}
                        strategy={rectSortingStrategy}
                    >
                        <motion.div
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20"
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                        >
                            {generatedOutfit.map((item, index) => (
                                <SortableItem
                                    key={item.slug || item.title}
                                    id={item.slug || item.title}
                                    item={item}
                                    index={index}
                                />
                            ))}
                        </motion.div>
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
}

