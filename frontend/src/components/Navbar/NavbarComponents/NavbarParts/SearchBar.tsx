"use client";

import { Search } from "lucide-react";
import { useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";

type Props = {
    /** when true, behaves as the pill used inside Island navbar */
    island?: boolean;
};

export default function SearchBar({ island = false }: Props) {
    const [q, setQ] = useState("");

    const wrapperClass = island
        ? "w-[70%]"
        : "w-full max-w-[min(96vw,36rem)] md:max-w-[min(92vw,40rem)]";

    const handleSearch = () => {
        if (q.trim()) {
            window.location.href = `/catalog?search=${encodeURIComponent(q)}`;
        }
    };

    return (
        <div className={`relative ${wrapperClass}`}>
            <div className="group relative w-full">
                <div className="pointer-events-none absolute inset-0 rounded-full bg-black/5 blur-sm opacity-0 group-hover:opacity-100 transition" />
                <div className="flex items-center gap-2 rounded-full border border-black/15 bg-white/85 px-3 sm:px-4 py-2 shadow-sm backdrop-blur-md hover:bg-white/95 transition">
                    <Search className="h-4 w-4 text-black/70" />
                    <input
                        value={q}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                        placeholder="Search tees, hoodies, joggers…"
                        onKeyDown={(e: ReactKeyboardEvent<HTMLInputElement>) => {
                            if (e.key === "Enter") {
                                handleSearch();
                            }
                        }}
                        className="flex-1 bg-transparent text-sm text-black placeholder:text-black/50 focus:outline-none"
                    />
                    <kbd className="ml-1 hidden md:inline-flex h-5 items-center rounded-md border border-black/20 bg-black/5 px-1.5 text-[10px] text-black/60">
                        /
                    </kbd>
                </div>
            </div>
        </div>
    );
}
