// src/components/cove-ai/ChatProductCard.tsx
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingCart, Heart, ExternalLink, Sparkles, Check, X, ShoppingBag } from "lucide-react";

import type { AgentItem } from "@/types/agent";
import type { CartItem } from "@/types/cart";
import { useCartStore } from "@/store/cartStore";
import {
  resolveAgentItemForChat,
  fallbackResolveAgentItemForChat,
  type ResolvedProductForChat,
} from "@/lib/agentItemResolver";

type ChatProductCardProps = {
  item: AgentItem;
  index?: number;
};

export default function ChatProductCard({ item, index = 0 }: ChatProductCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Start with a cheap synchronous fallback (AgentItem fields only)
  const [resolved, setResolved] = useState<ResolvedProductForChat>(() =>
    fallbackResolveAgentItemForChat(item),
  );

  // On mount / when item changes, hydrate from Neon via /api/catalog/product
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const next = await resolveAgentItemForChat(item);
      if (!cancelled) {
        setResolved(next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    item.variantId,
    item.slug,
    item.color,
    item.title,
    item.tier,
    item.type,
    item.url,
    item.reason,
  ]);

  const {
    title,
    subtitle,
    colorName,
    priceLabel,
    imageUrl,
    productUrl,
    fromCatalog,
    reason,
  } = resolved;

  const handleClick = () => {
    if (productUrl) {
      router.push(productUrl);
    }
  };

  const addItem = useCartStore((s) => s.addItem);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdding || isAdded) return;

    setIsAdding(true);
    try {
      // Construct a cart item from the agent item
      const cartItem: CartItem = {
        productId: item.slug || item.variantId || 'unknown',
        variantId: item.variantId || 'unknown',
        name: title,
        price: 0, // TODO: Get real price if available
        quantity: 1,
        imageUrl: imageUrl || '',  // Use external URL from catalog
        size: item.size || 'M', // Default or from item
        color: item.color || 'Black',
        colorName: colorName || item.color || 'Black',
        tier: item.tier || '',
        type: item.type || 'clothing',
        material: '',
      };

      await addItem(cartItem);

      // Show success state
      setIsAdding(false);
      setIsAdded(true);

      // Reset after 2 seconds
      setTimeout(() => {
        setIsAdded(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to add to cart", err);
      setIsAdding(false);
    }
  };

  return (
    <div
      className={`
        group relative
        w-60 h-[340px] shrink-0
        rounded-2xl overflow-hidden
        bg-white border border-neutral-100
        transition-all duration-300 ease-out
        hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1
        cursor-pointer
        animate-fade-in-up
      `}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      role="button"
    >
      {/* Full Background Image Area - Taller aspect ratio */}
      <div className="relative h-[240px] w-full bg-neutral-50 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            unoptimized
            className={`
              object-cover transition-transform duration-700
              ${isHovered ? 'scale-105' : 'scale-100'}
            `}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-300">
            {/* Subtle fallback icon */}
            <div className="flex flex-col items-center gap-2">
              <ShoppingBag size={24} strokeWidth={1.5} />
            </div>
          </div>
        )}

        {/* Floating Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          {item.tier && (
            <div className="px-2 py-1 rounded-md bg-white/90 backdrop-blur shadow-sm border border-neutral-100">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-900">{item.tier}</span>
            </div>
          )}
          {item.gender && (
            <div className="px-2 py-1 rounded-md bg-black/80 backdrop-blur shadow-sm border border-neutral-900">
              <span className="text-[10px] uppercase font-bold tracking-wider text-white">
                {item.gender === 'male' ? 'MEN' : item.gender === 'female' ? 'WOMEN' : item.gender === 'unisex' ? 'UNISEX' : item.gender}
              </span>
            </div>
          )}
        </div>

        {/* Like Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked(!isLiked);
          }}
          className={`
              absolute top-3 right-3
              h-8 w-8 rounded-full flex items-center justify-center
              transition-all duration-200 shadow-sm
              ${isLiked ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-white text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50'}
            `}
        >
          <Heart size={16} className={isLiked ? "fill-current" : ""} />
        </button>
      </div>

      {/* Content Area - Clean, high contrast */}
      <div className="p-4 flex flex-col justify-between h-[100px]">
        <div>
          <div className="flex justify-between items-start gap-2 mb-1">
            <h3 className="font-bold text-sm text-neutral-900 leading-snug line-clamp-2">
              {title}
            </h3>
            {priceLabel && (
              <span className="shrink-0 font-medium text-sm text-neutral-900">
                {priceLabel}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-neutral-500 line-clamp-1">{subtitle}</p>
          )}
        </div>

        {/* Hover Action: Add to Cart (Overlays bottom slightly or just appears) */}
        <button
          onClick={handleAddToCart}
          disabled={isAdding || isAdded}
          className={`
                mt-2 w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 
                transition-all duration-200
                ${isAdded
              ? 'bg-emerald-500 text-white'
              : isAdding
                ? 'bg-neutral-100 text-neutral-400 cursor-wait'
                : 'bg-black text-white hover:bg-neutral-800' // Strong CTA
            }
            `}
        >
          {isAdded ? (
            <>
              <Check size={14} strokeWidth={3} />
              Added
            </>
          ) : isAdding ? (
            <div className="h-3 w-3 border-2 border-neutral-400 border-t-neutral-600 rounded-full animate-spin" />
          ) : (
            "Add to Cart"
          )}
        </button>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
