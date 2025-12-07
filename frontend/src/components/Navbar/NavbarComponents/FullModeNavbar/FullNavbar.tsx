

"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Globe2, Heart } from "lucide-react";
import { useScrollPhase } from "../../hooks/useScrollPhase";
import { useCartStore } from "@/src/store/cartStore";
import CartModal from "@/src/components/Catalog/CartModal";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";

type LayoutPhase = "expanded" | "compressed";

const EXPANDED_TO_COMPRESSED_Y = 130; // scroll threshold
const TARGET_GAP = 24; // px gap between side sections and center

// persists across unmount/mount of FullNavbar
let LAST_COMPRESSED_OFFSET = 0;

export default function FullNavbar() {
  const { y } = useScrollPhase();
  const layoutPhase: LayoutPhase =
    y < EXPANDED_TO_COMPRESSED_Y ? "expanded" : "compressed";

  const [cartOpen, setCartOpen] = useState(false);
  const { items } = useCartStore();
  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { signOut } = useClerk();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const centerRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);

  const [compressedOffset, setCompressedOffset] = useState(
    LAST_COMPRESSED_OFFSET,
  );

  // **same offset math as before**
  useEffect(() => {
    const recompute = () => {
      if (!rootRef.current || !leftRef.current || !centerRef.current || !rightRef.current)
        return;

      const total = rootRef.current.clientWidth;
      const centerW = centerRef.current.clientWidth;
      const leftW = leftRef.current.clientWidth;
      const rightW = rightRef.current.clientWidth;

      const halfSideSpace = (total - centerW) / 2;
      const offsetLeft = halfSideSpace - leftW - TARGET_GAP;
      const offsetRight = halfSideSpace - rightW - TARGET_GAP;

      const safeOffset = Math.max(0, Math.min(offsetLeft, offsetRight));

      setCompressedOffset(safeOffset);
      LAST_COMPRESSED_OFFSET = safeOffset;
    };

    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

  const leftOffset = layoutPhase === "expanded" ? 0 : compressedOffset;
  const rightOffset = layoutPhase === "expanded" ? 0 : -compressedOffset;

  const sideTransition = "transform 0.35s ease-in-out";
  const centerTransition = "transform 0.28s ease-in-out";

  const leftBase =
    "flex items-center gap-2 sm:gap-3 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium tracking-wide transition-[background-color,box-shadow] duration-300";
  const centerBase =
    "max-w-xl w-full rounded-full px-2 sm:px-3 py-1 transition-[background-color,box-shadow] duration-300";
  const rightBase =
    "flex items-center gap-2 sm:gap-3 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm transition-[background-color,box-shadow] duration-300 ml-auto";

  const leftBg =
    layoutPhase === "compressed"
      ? " bg-white shadow-[0_10px_35px_rgba(15,23,42,0.12)]"
      : " bg-transparent";

  const centerBg = " bg-transparent shadow-none";


  const rightBg =
    layoutPhase === "compressed"
      ? " bg-white shadow-[0_10px_35px_rgba(15,23,42,0.12)]"
      : " bg-transparent";

  return (
    <>
      {/* add nav-fullmode class so we can override bg only for this mode */}
      <motion.div
        className="nav-stick nav-fullmode w-full"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
      >
        <div
          ref={rootRef}
          className="nav-shell nav-fullmode-shell w-full"
        >
          <div className="h-16 flex items-center w-full">
            {/* LEFT SECTION */}
            <div
              ref={leftRef}
              className={leftBase + leftBg}
              style={{
                transform: `translateX(${leftOffset}px)`,
                transition: sideTransition,
              }}
            >
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.18em]"
              >
                COVE
              </button>

              <button
                type="button"
                onClick={() => router.push("/catalog")}
                className="hidden sm:inline-flex rounded-full px-3 py-1.5 text-xs md:text-sm hover:bg-black/5"
              >
                Catalog
              </button>
              <button
                type="button"
                onClick={() => router.push("/orders")}
                className="hidden sm:inline-flex rounded-full px-3 py-1.5 text-xs md:text-sm hover:bg-black/5"
              >
                My orders
              </button>
            </div>

            {/* CENTER SECTION */}
            <div className="flex-1 flex justify-center">
              <div
                ref={centerRef}
                className={centerBase + centerBg}
                style={{
                  transform:
                    layoutPhase === "expanded" ? "scale(1)" : "scale(0.88)",
                  transition: centerTransition,
                }}
              >
                <SearchBarWrapper />
              </div>
            </div>

            {/* RIGHT SECTION */}
            <div
              ref={rightRef}
              className={rightBase + rightBg}
              style={{
                transform: `translateX(${rightOffset}px)`,
                transition: sideTransition,
              }}
            >
              {isSignedIn ? (
                <>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="hidden sm:inline-flex rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium bg-black text-white hover:bg-black/90"
                  >
                    Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut()
                      router.push('/')
                    }}
                    className="hidden sm:inline-flex rounded-full px-3 py-1.5 text-xs sm:text-sm hover:bg-black/5"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => router.push('/sign-in')}
                    className="hidden sm:inline-flex rounded-full px-3 py-1.5 text-xs sm:text-sm hover:bg-black/5"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/sign-up')}
                    className="hidden sm:inline-flex rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium bg-black text-white hover:bg-black/90"
                  >
                    Sign up
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="relative inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full hover:bg-black/5 min-h-[44px] min-w-[44px]"
              >
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-black text-[10px] font-semibold text-white">
                    {itemCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full hover:bg-black/5 min-h-[44px] min-w-[44px]"
              >
                <Globe2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              <button
                type="button"
                className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full hover:bg-black/5 min-h-[44px] min-w-[44px]"
              >
                <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <CartModal open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

function SearchBarWrapper() {
  // lazy require to avoid circular import issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const SearchBar =
    require("../NavbarParts/SearchBar").default ||
    require("../NavbarParts/SearchBar");
  return <SearchBar />;
}
