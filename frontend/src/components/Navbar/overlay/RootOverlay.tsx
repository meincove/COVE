
// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import RightActions from "@/src/components/Navbar/NavbarComponents/NavbarParts/RightActions";
// import SearchBar from "@/src/components/Navbar/NavbarComponents/NavbarParts/SearchBar";

// export default function RootOverlay() {
//   const [open, setOpen] = useState(false);

//   useEffect(() => {
//     const onOpen = () => setOpen(true);
//     const onClose = () => setOpen(false);
//     const onToggle = () => setOpen((p) => !p);
//     window.addEventListener("cove:menu:open", onOpen);
//     window.addEventListener("cove:menu:close", onClose);
//     window.addEventListener("cove:menu:toggle", onToggle);
//     return () => {
//       window.removeEventListener("cove:menu:open", onOpen);
//       window.removeEventListener("cove:menu:close", onClose);
//       window.removeEventListener("cove:menu:toggle", onToggle);
//     };
//   }, []);

//   useEffect(() => {
//     document.documentElement.classList.toggle("menu-open", open);
//   }, [open]);

//   useEffect(() => {
//     if (!open) return;
//     const handler = (e: MouseEvent) => {
//       const frame = document.querySelector(".tester-frame");
//       if (frame && frame.contains(e.target as Node)) {
//         window.dispatchEvent(new Event("cove:menu:close"));
//       }
//     };
//     document.addEventListener("mousedown", handler, true);
//     return () => document.removeEventListener("mousedown", handler, true);
//   }, [open]);

//   return (
//     <>
//       {/* orange backdrop */}
//       <div
//         aria-hidden
//         style={{
//           position: "fixed",
//           inset: 0,
//           background: "oklch(0.93 0.08 70)",
//           opacity: open ? 1 : 0,
//           transition: "opacity .25s ease",
//           zIndex: 120,
//           pointerEvents: "none",
//         }}
//       />

//       {/* top band */}
//       <div
//         className="overlay-bands"
//         style={{
//           opacity: open ? 1 : 0,
//           transition: "opacity .25s ease",
//           pointerEvents: open ? "auto" : "none",
//         }}
//       >
//         <div className="overlay-top-band">
//           <div className="overlay-top-inner">
//             {/* LEFT slot — debug bg */}
//             <div className="overlay-slot-left rounded-md px-2 py-1 bg-rose-100/80">
//               <Link href="/" className="overlay-logo">C O V E</Link>
//               <Link href="/catalog" className="px-2 py-1 rounded-md hover:bg-black/5">
//                 Catalog
//               </Link>
//               <Link href="/orders" className="px-2 py-1 rounded-md hover:bg-black/5">
//                 My Orders
//               </Link>
//             </div>

//             {/* CENTER slot — debug bg + dropdown will open here */}
//             <div className="overlay-slot-center rounded-md px-2 py-1 bg-blue-100/70">
//               <SearchBar />
//             </div>

//             {/* RIGHT slot — debug bg */}
//             <div className="overlay-slot-right rounded-md px-2 py-1 bg-gray-200/80">
//               <RightActions />
//               <button
//                 className="ml-2 rounded-md bg-red-600 text-white px-3 py-1"
//                 onClick={() => window.dispatchEvent(new Event("cove:menu:close"))}
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }



"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RightActions from "@/src/components/Navbar/NavbarComponents/NavbarParts/RightActions";
import SearchBar from "@/src/components/Navbar/NavbarComponents/NavbarParts/SearchBar";

const DEV_FLAG_KEY = "cove:overlayDebug";

export default function RootOverlay() {
  const [open, setOpen] = useState(false);
  const [devOnly, setDevOnly] = useState(false);

  // ————— events from navbar —————
  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    const onToggle = () => setOpen((p) => !p);
    window.addEventListener("cove:menu:open", onOpen);
    window.addEventListener("cove:menu:close", onClose);
    window.addEventListener("cove:menu:toggle", onToggle);
    return () => {
      window.removeEventListener("cove:menu:open", onOpen);
      window.removeEventListener("cove:menu:close", onClose);
      window.removeEventListener("cove:menu:toggle", onToggle);
    };
  }, []);

  // ————— normal menu-open page shrink —————
  useEffect(() => {
    if (devOnly) return;
    document.documentElement.classList.toggle("menu-open", open);
  }, [open, devOnly]);

  // ————— dev overlay-only mode (optional) —————
  useEffect(() => {
    const hasQuery =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("overlayOnly") === "1";
    const saved = typeof window !== "undefined" && localStorage.getItem(DEV_FLAG_KEY) === "1";
    if (hasQuery || saved) {
      setDevOnly(true);
      setOpen(true);
      document.documentElement.classList.add("overlay-dev");
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "o") {
        const next = !devOnly;
        setDevOnly(next);
        if (next) {
          localStorage.setItem(DEV_FLAG_KEY, "1");
          setOpen(true);
          document.documentElement.classList.add("overlay-dev");
        } else {
          localStorage.removeItem(DEV_FLAG_KEY);
          document.documentElement.classList.remove("overlay-dev");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [devOnly]);

  // ————— click inside shrunken page closes menu (normal mode only) —————
  useEffect(() => {
    if (!open || devOnly) return;
    const handler = (e: MouseEvent) => {
      const frame = document.querySelector(".tester-frame");
      if (frame && frame.contains(e.target as Node)) {
        window.dispatchEvent(new Event("cove:menu:close"));
      }
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [open, devOnly]);

  const bandsStyle = useMemo(
    () => ({
      opacity: devOnly ? 1 : open ? 1 : 0,
      transition: devOnly ? "none" : "opacity .25s ease",
      pointerEvents: devOnly ? "auto" : open ? "auto" : "none",
    }),
    [open, devOnly]
  );

  return (
    <>
      {/* orange tint behind the card */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "oklch(0.93 0.08 70)",
          opacity: devOnly ? 1 : open ? 1 : 0,
          transition: devOnly ? "none" : "opacity .25s ease",
          zIndex: 120,
          pointerEvents: "none",
        }}
      />

      <div className="overlay-bands" style={bandsStyle as React.CSSProperties}>
        <div className="overlay-top-band">
          {/* White card (sizes & containment handled in CSS) */}
          <div
            className="
              overlay-top-inner
              /* responsive grid: 1 column on mobile, 3 on md+ */
              grid grid-cols-1 md:grid-cols-[1fr_1.3fr_1fr]
            "
          >
            {/* LEFT slot */}
            <div
              className="overlay-slot-left"
              style={{ background: "rgba(255,182,193,.28)", borderRadius: 10 }}
            >
              <Link href="/" className="overlay-logo">C O V E</Link>
              <Link href="/catalog" className="px-2 py-1 rounded-md hover:bg-black/5">
                Catalog
              </Link>
              <Link href="/orders" className="px-2 py-1 rounded-md hover:bg-black/5">
                My Orders
              </Link>
            </div>

            {/* CENTER slot (search) */}
            <div
              className="overlay-slot-center"
              style={{ background: "rgba(173,216,230,.28)", borderRadius: 10 }}
            >
              <SearchBar />
            </div>

            {/* RIGHT slot */}
            <div
              className="overlay-slot-right justify-end md:justify-end"
              style={{ background: "rgba(156,163,175,.28)", borderRadius: 10 }}
            >
              <RightActions />
              <button
                className="overlay-close"
                onClick={() => {
                  if (devOnly) {
                    localStorage.removeItem(DEV_FLAG_KEY);
                    document.documentElement.classList.remove("overlay-dev");
                    setDevOnly(false);
                  } else {
                    window.dispatchEvent(new Event("cove:menu:close"));
                  }
                }}
                style={{ background: "#e11d48", color: "white" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {devOnly && (
        <div
          style={{
            position: "fixed",
            right: 12,
            bottom: 12,
            zIndex: 9999,
            background: "black",
            color: "white",
            padding: "6px 10px",
            borderRadius: 10,
            opacity: .75,
          }}
        >
          Overlay Dev (Ctrl+Shift+O)
        </div>
      )}
    </>
  );
}
