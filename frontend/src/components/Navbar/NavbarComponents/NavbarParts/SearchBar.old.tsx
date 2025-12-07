"use client";

import { Mic, Search, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

// ✅ import the portal + its AnchorMode type
import SearchDropdownPortal, {
  AnchorMode,
} from "@/src/components/NavbarComponents/SearchDropdownPortal";

// ---------------- Small helpers (same as before) ----------------
function Spinner() {
  return (
    <span
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-black/25"
      style={{ borderTopColor: "rgba(0,0,0,0.75)" }}
      aria-label="Loading"
    />
  );
}

type Props = {
  /** when true, behaves as the pill used inside Island navbar */
  island?: boolean;
};

export default function SearchBar({ island = false }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // focus when opened
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "/" && !(e.target as HTMLElement)?.closest("input,textarea")) {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // anchor: in island mode we want the pill shell; otherwise our wrapper
  const anchorEl: HTMLElement | null = island
    ? (typeof document !== "undefined"
        ? document.getElementById("cove-navbar-shell")
        : null)
    : wrapRef.current;

  const RECENT = useMemo(
    () => ["black hoodie", "380 GSM tee", "bomber jacket", "straight-fit pants"],
    []
  );
  const EXPERT = useMemo(
    () => [
      "Layering guide for winter fits",
      "Best fabrics for 380 GSM tees",
      "How to style bomber with chinos",
      "Pick the right size by body type",
    ],
    []
  );
  const suggestions = useMemo(() => {
    if (!q) return RECENT.slice(0, 4);
    const lower = q.toLowerCase();
    return RECENT.filter((s) => s.toLowerCase().includes(lower)).slice(0, 6);
  }, [q, RECENT]);

  const wrapperClass = island
    ? "w-[70%]"
    : "w-full max-w-[min(96vw,36rem)] md:max-w-[min(92vw,40rem)]";

  const handleStartListening = () => {
    if (isLoading) return;
    setIsLoading(true);
    setIsListening(false);
    setTimeout(() => {
      setIsLoading(false);
      setIsListening(true);
    }, 1200);
  };

  const handleMicClick = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    handleStartListening();
  };

  const DropdownBody = (
    <div className="origin-top rounded-2xl border border-black/10 bg-white/95 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-10">
        {/* LEFT 70% */}
        <div className="md:col-span-7 p-3 md:p-4">
          <div className="mb-3">
            <div className="text-[12px] uppercase tracking-wide text-black/60 mb-2">
              Recent Searches
            </div>
            <ul className="space-y-1.5">
              {suggestions.map((s) => (
                <li key={s}>
                  <a
                    href={`/catalog?search=${encodeURIComponent(s)}`}
                    className="block rounded-lg px-2 py-1.5 hover:bg-black/5 text-sm text-black/90"
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[12px] uppercase tracking-wide text-black/60 mb-2">
              Cove AI – Expert Suggestions
            </div>
            <ul className="space-y-1.5">
              {EXPERT.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => setQ(s)}
                    className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-black/5 text-sm text-black/85"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* RIGHT 30% */}
        <div className="md:col-span-3 border-t md:border-t-0 md:border-l border-black/10 p-4 flex flex-col items-center justify-center gap-3">
          <button
            onClick={handleMicClick}
            className={[
              "relative flex h-12 w-12 items-center justify-center rounded-full",
              "bg-black/5 border border-black/15 hover:bg-black/10 transition",
              isListening ? "animate-[pulse_1.6s_ease-out_infinite]" : "",
            ].join(" ")}
            aria-pressed={isListening}
            aria-label={isListening ? "Stop listening" : "Start listening"}
            disabled={isLoading}
          >
            {isLoading ? (
              <Spinner />
            ) : (
              <Mic className="h-5 w-5 text-black/70" />
            )}
          </button>

          <div className="text-sm text-black/80">Cove AI</div>
          <div className="text-xs text-black/60">
            {isLoading ? "Starting…" : isListening ? "Listening" : "Listening mode"}
          </div>

          <button
            onClick={handleStartListening}
            disabled={isLoading}
            className="mt-1 rounded-full border border-black/15 bg-black/5 px-3 py-1.5 text-xs text-black/80 hover:bg-black/10 disabled:opacity-60 transition"
          >
            {isListening ? "Restart" : "Start"}
          </button>
        </div>
      </div>

      <div className="pointer-events-none h-4 w-full rounded-b-2xl bg-gradient-to-b from-transparent to-black/10" />
    </div>
  );

  return (
    <div ref={wrapRef} className={`relative ${wrapperClass}`}>
      {/* pill */}
      <div className="group relative w-full">
        <div className="pointer-events-none absolute inset-0 rounded-full bg-black/5 blur-sm opacity-0 group-hover:opacity-100 transition" />
        <div className="flex items-center gap-2 rounded-full border border-black/15 bg-white/85 px-3 sm:px-4 py-2 shadow-sm backdrop-blur-md hover:bg-white/95 transition">
          <Search className="h-4 w-4 text-black/70" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Search tees, hoodies, joggers…"
            onKeyDown={(e: ReactKeyboardEvent<HTMLInputElement>) => {
              if (e.key === "/") e.preventDefault();
              if (e.key === "Enter") {
                window.location.href = `/catalog?search=${encodeURIComponent(q)}`;
              }
            }}
            className="flex-1 bg-transparent text-sm text-black placeholder:text-black/50 focus:outline-none"
          />
          <kbd className="ml-1 hidden md:inline-flex h-5 items-center rounded-md border border-black/20 bg-black/5 px-1.5 text-[10px] text-black/60">
            /
          </kbd>
          <button
            aria-label="Close search"
            className="rounded-md p-1 hover:bg-black/5"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4 text-black/70" />
          </button>
        </div>
      </div>

      {/* dropdown via portal */}
      <SearchDropdownPortal
        open={open}
        onClose={() => setOpen(false)}
        anchorEl={anchorEl}
        zIndex={260}
        gap={10}
        mode={(island ? "island" : "full") as AnchorMode}
      >
        {DropdownBody}
      </SearchDropdownPortal>
    </div>
  );
}
