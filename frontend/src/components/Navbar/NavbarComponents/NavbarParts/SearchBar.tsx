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
import SearchDropdownPortal, { type AnchorMode } from "@/src/components/NavbarComponents/SearchDropdownPortal";

/* ---------- Animated SVG grain overlay (visible on dark) ---------- */
/* Works everywhere without external assets; uses blend + isolation.  */
function GrainOverlay({ opacity = 0.22 }: { opacity?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[var(--grain-o)]">
      <style
        // keep this scoped
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes cove-grain-wobble {
            0%   { transform: translate3d(0,0,0) }
            25%  { transform: translate3d(-4px, 3px, 0) }
            50%  { transform: translate3d(3px, -5px, 0) }
            75%  { transform: translate3d(-2px, 4px, 0) }
            100% { transform: translate3d(0,0,0) }
          }
        `,
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={
          {
            animation: "cove-grain-wobble 3.2s steps(2,end) infinite",
            // pass opacity value through CSS var so Tailwind doesn't strip it
            ["--grain-o" as any]: opacity.toString(),
          } as React.CSSProperties
        }
      >
        <filter id="cove-grain-filter">
          {/* fractal noise; animate baseFrequency slightly for life */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.95"
            numOctaves="2"
            stitchTiles="stitch"
          >
            <animate
              attributeName="baseFrequency"
              dur="5s"
              values="0.85;0.95;0.9;0.96;0.88;0.85"
              repeatCount="indefinite"
            />
          </feTurbulence>
          {/* desaturate */}
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cove-grain-filter)" />
      </svg>
      {/* tiny dot layer to add “texture” regardless of SVG impl quirks */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            `radial-gradient(1px 1px at 12% 22%, rgba(255,255,255,.25) 50%, transparent 51%),
             radial-gradient(1px 1px at 72% 18%, rgba(255,255,255,.18) 50%, transparent 51%),
             radial-gradient(1px 1px at 40% 76%, rgba(255,255,255,.20) 50%, transparent 51%),
             radial-gradient(1px 1px at 88% 64%, rgba(255,255,255,.16) 50%, transparent 51%)`,
          backgroundSize: "240px 240px, 220px 220px, 260px 260px, 200px 200px",
          opacity: 0.35,
        }}
      />
    </div>
  );
}

/* Spinner for loading */
function Spinner() {
  return (
    <span
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/35"
      style={{ borderTopColor: "rgba(255,255,255,0.95)" }}
      aria-label="Loading"
    />
  );
}

/* one-time keyframes for mic pulse */
if (typeof document !== "undefined") {
  const id = "cove-pulse-kf";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      @keyframes cove-pulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,.26); }
        55%     { box-shadow: 0 0 0 14px rgba(255,255,255,0); }
      }
    `;
    document.head.appendChild(style);
  }
}

type Props = { island?: boolean };

export default function SearchBar({ island = false }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // focus on open
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open]);

  // shortcuts
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

  // anchor element
  const anchorEl: HTMLElement | null = island
    ? (typeof document !== "undefined" ? document.getElementById("cove-navbar-shell") : null)
    : wrapRef.current;

  const RECENT = useMemo(() => ["black hoodie", "380 GSM tee", "bomber jacket", "straight-fit pants"], []);
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

  // search pill width
  const wrapperClass = island
    ? "w-[70%]" // pill = 70% of island shell
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

  // dropdown body with grainy right pane
  const DropdownBody = (
    <div className="origin-top rounded-2xl border border-white/10 bg-black/82 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-10">
        {/* LEFT 70% */}
        <div className="md:col-span-7 p-3 md:p-4">
          <div className="mb-3">
            <div className="text-[12px] uppercase tracking-wide text-white/60 mb-2">
              Recent Searches
            </div>
            <ul className="space-y-1.5">
              {suggestions.map((s) => (
                <li key={s}>
                  <a
                    href={`/catalog?search=${encodeURIComponent(s)}`}
                    className="block rounded-lg px-2 py-1.5 hover:bg-white/5 text-sm text-white/90"
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[12px] uppercase tracking-wide text-white/60 mb-2">
              Cove AI – Expert Suggestions
            </div>
            <ul className="space-y-1.5">
              {EXPERT.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => setQ(s)}
                    className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-white/5 text-sm text-white/85"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* RIGHT 30% — grain overlay lives here */}
        <div className="relative isolate md:col-span-3 border-t md:border-t-0 md:border-l border-white/10 p-4 flex flex-col items-center justify-center gap-3">
          {/* Grain layer (under content but above background) */}
          <GrainOverlay opacity={0.26} />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            <button
              onClick={handleMicClick}
              className={[
                "relative flex h-12 w-12 items-center justify-center rounded-full",
                "bg-white/10 border border-white/20 hover:bg-white/15 transition",
                isListening ? "animate-[cove-pulse_1.6s_ease-out_infinite]" : "",
              ].join(" ")}
              aria-pressed={isListening}
              aria-label={isListening ? "Stop listening" : "Start listening"}
              disabled={isLoading}
            >
              {isLoading ? <Spinner /> : <Mic className="h-5 w-5 text-white/90" />}
            </button>

            <div className="text-sm text-white/90">Cove AI</div>
            <div className="text-xs text-white/60">
              {isLoading ? "Starting…" : isListening ? "Listening" : "Listening mode"}
            </div>

            <button
              onClick={handleStartListening}
              disabled={isLoading}
              className="mt-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/90 hover:bg-white/15 disabled:opacity-60 transition"
            >
              {isListening ? "Restart" : "Start"}
            </button>
          </div>
        </div>
      </div>

      <div className="pointer-events-none h-4 w-full rounded-b-2xl bg-gradient-to-b from-transparent to-black/40" />
    </div>
  );

  return (
    <div ref={wrapRef} className={`relative ${wrapperClass}`}>
      {/* single input pill */}
      <div className="group relative w-full">
        <div className="pointer-events-none absolute inset-0 rounded-full bg-white/5 blur-sm opacity-0 group-hover:opacity-100 transition" />
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 sm:px-4 py-2 shadow-sm backdrop-blur-md hover:bg-white/15 transition">
          <Search className="h-4 w-4 text-white/70" />
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
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
          />
          <kbd className="ml-1 hidden md:inline-flex h-5 items-center rounded-md border border-white/20 bg-black/40 px-1.5 text-[10px] text-white/60">
            /
          </kbd>
          <button
            aria-label="Close search"
            className="rounded-md p-1 hover:bg-white/5"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Dropdown via portal */}
      <SearchDropdownPortal
        open={open}
        onClose={() => setOpen(false)}
        anchorEl={anchorEl}
        mode={island ? ("island" as AnchorMode) : ("full" as AnchorMode)}
        zIndex={80}
        gap={8}
      >
        {DropdownBody}
      </SearchDropdownPortal>
    </div>
  );
}
