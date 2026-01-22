"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ChatProductCard from "./ChatProductCard";
import type { AgentItem } from "@/types/agent";

type ProductCarouselProps = {
    items: AgentItem[];
};

export default function ProductCarousel({ items }: ProductCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(true);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeft(scrollLeft > 0);
        setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
    };

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return;
        const scrollAmount = 260; // Approximate card width + gap
        scrollRef.current.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth",
        });
    };

    if (!items || items.length === 0) return null;

    return (
        <div className="relative group w-full max-w-full">
            {/* Left Gradient & Button */}
            <div
                className={`
          absolute left-0 top-0 bottom-0 z-10 w-10
          bg-gradient-to-r from-gray-50 to-transparent
          flex items-center justify-start pl-1
          transition-opacity duration-300
          ${showLeft ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
            >
                <button
                    onClick={() => scroll("left")}
                    className="h-7 w-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
            </div>

            {/* Right Gradient & Button */}
            <div
                className={`
          absolute right-0 top-0 bottom-0 z-10 w-10
          bg-gradient-to-l from-gray-50 to-transparent
          flex items-center justify-end pr-1
          transition-opacity duration-300
          ${showRight ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
            >
                <button
                    onClick={() => scroll("right")}
                    className="h-7 w-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
            </div>

            {/* Scroll Container */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="
          flex gap-3 overflow-x-auto snap-x snap-mandatory
          px-4 py-3 scrollbar-hide
          w-full
        "
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {items.map((item, idx) => (
                    <div key={`${item.variantId}-${idx}`} className="snap-center shrink-0">
                        <ChatProductCard item={item} index={idx} />
                    </div>
                ))}
                {/* Spacer for right padding */}
                <div className="w-1 shrink-0" />
            </div>
        </div>
    );
}
