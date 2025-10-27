import * as React from "react";
import Link from "next/link";
import {
  motion,
  useAnimation,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

/**
 * WardrobeSection — Scroll-lit rail with a horizontally gliding conveyor of product cards.
 * - Semi-3D SVG lamps (cone beam + halo + tint)
 * - Realistic illumination via blend-mode overlays (screen + multiply)
 * - GPU-friendly (transform/opacity), reduced-motion aware, keyboard accessible
 */

export type WardrobeItem = {
  slug: string;
  name: string;
  image: string; // e.g. "/clothing-images/hoodie-1.jpg"
  price?: number;
  tier?: string;
};

// Duplicate items so the belt can loop seamlessly
function makeLoop<T>(arr: T[], minLength = 16): T[] {
  if (!arr || arr.length === 0) return [];
  const out: T[] = [];
  while (out.length < Math.max(minLength, arr.length * 2)) out.push(...arr);
  return out;
}

/** Semi-3D corner light with a masked cone beam + halo + warm tint */
function RealCornerLight({
  side,
  progress,
}: {
  side: "left" | "right";
  progress: number; // 0..1
}) {
  const flip = side === "right" ? -1 : 1;
  const intensity = Math.max(0, Math.min(1, progress));

  return (
    <svg
      aria-hidden
      className={`absolute -top-4 ${side === "left" ? "-left-2" : "-right-2"} w-[220px] h-[220px] md:w-[300px] md:h-[300px] pointer-events-none z-30`}
      viewBox="0 0 300 300"
      style={{ transform: `scaleX(${flip})` }}
    >
      <defs>
        <radialGradient id={`beam-falloff-${side}`} cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="white" stopOpacity={0.55 * intensity} />
          <stop offset="60%" stopColor="white" stopOpacity={0.16 * intensity} />
          <stop offset="100%" stopColor="white" stopOpacity={0} />
        </radialGradient>

        <radialGradient id={`halo-${side}`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity={0.9 * intensity} />
          <stop offset="100%" stopColor="white" stopOpacity={0} />
        </radialGradient>

        <linearGradient id={`warm-${side}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE7C2" stopOpacity={0.45 * intensity} />
          <stop offset="100%" stopColor="#FFD9A1" stopOpacity={0.0} />
        </linearGradient>

        <filter id={`spec-${side}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={`lamp-shadow-${side}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="black" floodOpacity="0.4" />
        </filter>

        {/* Mask shaping beam into a cone */}
        <mask id={`beam-mask-${side}`}>
          <linearGradient id={`mask-grad-${side}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0.1" />
          </linearGradient>
          <path d="M130,40 L170,40 L230,260 L70,260 Z" fill={`url(#mask-grad-${side})`} />
        </mask>
      </defs>

      {/* Beam */}
      <g mask={`url(#beam-mask-${side})`} filter={`url(#spec-${side})`}>
        <rect x="40" y="30" width="220" height="240" fill={`url(#beam-falloff-${side})`} />
        <rect x="40" y="30" width="220" height="240" fill={`url(#warm-${side})`} />
      </g>

      {/* Halo near lamp head */}
      <circle cx="150" cy="40" r="36" fill={`url(#halo-${side})`} />

      {/* Lamp hardware */}
      <g filter={`url(#lamp-shadow-${side})`}>
        <rect x="145" y="0" width="10" height="46" rx="5" fill="#9CA3AF" />
        <g>
          <path d="M125,30 Q150,8 175,30 L175,46 Q150,60 125,46 Z" fill="#D1D5DB" />
          <path d="M127,34 Q150,18 173,34 L173,40 Q150,50 127,40 Z" fill="#F3F4F6" />
          <path d="M125,42 L175,42 L175,46 Q150,60 125,46 Z" fill="#6B7280" opacity="0.55" />
        </g>
      </g>
    </svg>
  );
}

function WardrobeCard({ item }: { item: WardrobeItem }) {
  return (
    <li className="shrink-0 w-40 md:w-48 lg:w-56 mx-2 md:mx-3 list-none" role="listitem">
      <Link
        href={`/product/${item.slug}`}
        aria-label={`View ${item.name}`}
        className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl"
      >
        <div className="relative aspect-[3/4] rounded-2xl bg-neutral-900 overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover will-change-transform transition-transform duration-200 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-white" />
        </div>
        <div className="mt-2 text-sm md:text-base flex items-center justify-between text-neutral-200">
          <span className="truncate" title={item.name}>
            {item.name}
          </span>
          {typeof item.price === "number" && (
            <span className="text-neutral-400">€{item.price.toFixed(2)}</span>
          )}
        </div>
      </Link>
    </li>
  );
}

export function WardrobeSection({
  items,
  title = "Live Wardrobe",
  speed = 40, // px/s
  minLoop = 18,
}: {
  items: WardrobeItem[];
  title?: string;
  speed?: number;
  minLoop?: number;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { amount: 0.2, margin: "0px" });
  const controls = useAnimation();
  const shouldReduce = useReducedMotion();

  // Scroll progress for light warm-up (0 → 1)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 90%", "end 30%"] });
  const lightWarmth = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const [warm, setWarm] = React.useState(0);
  React.useEffect(() => {
    const unsub = lightWarmth.on("change", (v) => setWarm(v));
    return () => unsub();
  }, [lightWarmth]);

  // Loop items
  const loop = React.useMemo(() => makeLoop(items, minLoop), [items, minLoop]);

  // Auto-glide when in view (unless reduced motion)
  React.useEffect(() => {
    if (shouldReduce) {
      controls.stop();
      return;
    }
    if (inView) {
      controls.start({
        x: [0, -800],
        transition: { duration: 800 / speed, ease: "linear", repeat: Infinity },
      });
    } else {
      controls.stop();
    }
  }, [controls, inView, speed, shouldReduce]);

  // Pause on hover
  const [paused, setPaused] = React.useState(false);
  React.useEffect(() => {
    if (paused) controls.stop();
    else if (inView && !shouldReduce) {
      controls.start({
        x: [0, -800],
        transition: { duration: 800 / speed, ease: "linear", repeat: Infinity },
      });
    }
  }, [paused, inView, shouldReduce, controls, speed]);

  return (
    <section
      ref={ref}
      aria-labelledby="wardrobe-heading"
      className="relative w-full py-14 md:py-20 bg-black text-white overflow-hidden isolate"
    >
      {/* Lamps */}
      <RealCornerLight side="left" progress={warm} />
      <RealCornerLight side="right" progress={warm} />

      {/* --- Realistic illumination overlays --- */}
      {/* Screen-blend glow that brightens cards underneath */}
      <div
        aria-hidden
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          mixBlendMode: "screen",
          opacity: Math.max(0, Math.min(1, warm)) * 0.9,
          background: `
            radial-gradient(36rem 20rem at 10% 8%, rgba(255,243,220,0.55) 0%, rgba(255,243,220,0.22) 45%, rgba(255,243,220,0) 70%),
            radial-gradient(36rem 20rem at 90% 8%, rgba(255,243,220,0.55) 0%, rgba(255,243,220,0.22) 45%, rgba(255,243,220,0) 70%)
          `,
        }}
      />
      {/* Multiply vignette to restore contrast so glow reads as light */}
      <div
        aria-hidden
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          mixBlendMode: "multiply",
          opacity: Math.max(0, Math.min(1, warm)) * 0.35,
          background:
            "radial-gradient(140% 90% at 50% 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.25) 70%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      <div className="mx-auto max-w-7xl px-4 md:px-8 relative z-0">
        <div className="mb-6 md:mb-8 flex items-end justify-between">
          <h2 id="wardrobe-heading" className="text-xl md:text-2xl tracking-wide text-neutral-200">
            {title}
          </h2>
          <div className="text-xs md:text-sm text-neutral-500 select-none">
            {shouldReduce ? "Reduced motion" : "Scroll to wake lights"}
          </div>
        </div>

        {/* Rail */}
        <div className="relative h-8 md:h-10 mb-4">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-white/10 via-white/20 to-white/10 rounded-full" />
          {/* slight highlight on rail */}
          <div className="absolute inset-x-10 top-[calc(50%-2px)] h-px bg-white/20 rounded-full" />
        </div>

        {/* Conveyor viewport (under glow overlays) */}
        <div
          className="relative overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <motion.ul
            role="list"
            aria-label="Wardrobe items"
            className="flex items-stretch gap-2 md:gap-3 will-change-transform"
            animate={controls}
            initial={{ x: 0 }}
            style={{ translateZ: 0 }}
          >
            {loop.map((item, i) => (
              <WardrobeCard key={`${item.slug}-${i}`} item={item} />
            ))}
          </motion.ul>
        </div>

        <p className="mt-4 text-xs md:text-sm text-neutral-500">
          Tip: Tab through items and press Enter to open.
        </p>
      </div>
    </section>
  );
}

/** Local demo (remove in production) */
export default function ExampleWardrobeDemo() {
  const demo: WardrobeItem[] = [
    { slug: "black-hoodie", name: "Cove Hoodie — Black", image: "/clothing-images/black-hoodie-1.jpg", price: 49.99, tier: "originals" },
    { slug: "navy-bomber", name: "Cove Bomber — Navy", image: "/clothing-images/navy-bomber-1.jpg", price: 59.99, tier: "designer" },
    { slug: "stone-tee", name: "Cove Tee — Stone", image: "/clothing-images/stone-tee-1.jpg", price: 19.99, tier: "casual" },
    { slug: "charcoal-jogger", name: "Cove Jogger — Charcoal", image: "/clothing-images/charcoal-jogger-1.jpg", price: 34.99, tier: "casual" },
  ];
  return <WardrobeSection items={demo} />;
}
