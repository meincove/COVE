// src/components/cove-ai/ChatProductCard.tsx
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { AgentItem } from "@/types/agent";
import {
  resolveAgentItemForChat,
  fallbackResolveAgentItemForChat,
  type ResolvedProductForChat,
} from "@/src/lib/agentItemResolver";

type ChatProductCardProps = {
  item: AgentItem;
};

export default function ChatProductCard({ item }: ChatProductCardProps) {
  const router = useRouter();

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

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left rounded-2xl border border-neutral-800 bg-neutral-900/80 px-3 py-3 flex gap-3 hover:border-neutral-500 transition"
    >
      {/* Image / fallback */}
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-800">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-500 px-1 text-center">
            Image not available
          </div>
        )}
      </div>

      {/* Text section */}
      <div className="flex flex-col gap-1 text-xs text-neutral-100 flex-1">
        <div className="font-medium text-sm leading-tight">{title}</div>

        {subtitle && (
          <div className="text-[11px] text-neutral-400">{subtitle}</div>
        )}

        {reason && (
          <div className="text-[11px] text-neutral-300 line-clamp-2">
            {reason}
          </div>
        )}

        <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            {colorName && (
              <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300">
                {colorName}
              </span>
            )}
            <span
              className={`text-[10px] uppercase tracking-wide ${
                fromCatalog ? "text-emerald-400" : "text-neutral-500"
              }`}
            >
              {fromCatalog ? "IN CATALOG" : "NOT IN CURRENT CATALOG"}
            </span>
          </div>

          {priceLabel && (
            <span className="text-[11px] font-semibold text-neutral-50">
              {priceLabel}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
