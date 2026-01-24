// src/components/cove-ai/ChatProductCard.tsx
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingCart, Heart, ExternalLink, Sparkles, Check, X } from "lucide-react";

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
        w-56 h-[300px] shrink-0
        rounded-xl overflow-hidden
        bg-white border border-gray-200
        transform transition-all duration-300 ease-out
        hover:scale-[1.02] hover:shadow-lg hover:border-gray-300
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
      {/* Full Background Image */}
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          unoptimized
          className={`
            object-cover transition-transform duration-700
            ${isHovered ? 'scale-110' : 'scale-100'}
          `}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
          <Sparkles className="h-12 w-12 text-neutral-600 animate-pulse" />
        </div>
      )}

      {/* Gradient Overlay - Light version */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Top Badges */}
      <div className="absolute top-2 left-2 flex flex-col gap-1">
        {(fromCatalog || imageUrl || priceLabel) && (
          <div className="px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 flex items-center gap-1">
            <Check className="h-2.5 w-2.5 text-green-500" />
            <span className="text-[9px] font-medium text-gray-700">Available</span>
          </div>
        )}
        {item.tier && (
          <div className="px-2 py-0.5 rounded-full bg-gray-800/80 backdrop-blur-sm">
            <span className="text-[9px] font-medium text-white">{item.tier}</span>
          </div>
        )}
      </div>

      {/* Like Button - Floating Top Right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsLiked(!isLiked);
        }}
        className={`
          absolute top-2 right-2
          h-7 w-7 rounded-full flex items-center justify-center
          backdrop-blur-sm transition-all duration-200
          ${isLiked ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-500 hover:bg-white border border-gray-200'}
        `}
      >
        <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-current' : ''}`} />
      </button>

      {/* Bottom Content Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        {/* Title & Price */}
        <div>
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-sm text-white leading-tight line-clamp-2 flex-1">
              {title}
            </h3>
            {priceLabel && (
              <span className="font-bold text-sm text-white bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-sm">
                {priceLabel}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-neutral-300 mt-1 line-clamp-1">{subtitle}</p>
          )}
        </div>

        {/* Reason Pill */}
        {reason && (
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-purple-400" />
            <p className="text-[10px] text-purple-200 line-clamp-1">
              {reason}
            </p>
          </div>
        )}

        {/* Action Button - Expands on Hover */}
        <div className={`
          overflow-hidden transition-all duration-300
          ${isHovered ? 'max-h-12 opacity-100 mt-2' : 'max-h-0 opacity-0'}
        `}>
          <button
            onClick={handleAddToCart}
            disabled={isAdding || isAdded}
            className={`
              w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 
              transition-all duration-300
              ${isAdded
                ? 'bg-emerald-500 text-white'
                : isAdding
                  ? 'bg-neutral-500 text-white cursor-not-allowed'
                  : 'bg-white text-black hover:bg-neutral-200'
              }
            `}
          >
            {isAdded ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Added!
              </>
            ) : isAdding ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" />
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
