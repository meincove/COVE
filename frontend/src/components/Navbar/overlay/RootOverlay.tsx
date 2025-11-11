// src/components/Navbar/overlay/RootOverlay.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ⬇️ Adjust paths if your files are elsewhere
import RightActions from "@/src/components/Navbar/NavbarComponents/NavbarParts/RightActions";
import SearchBar from "@/src/components/NavbarComponents/SearchBar/index";

export default function RootOverlay() {
  const [open, setOpen] = useState(false);

  // listen for open/close/toggle from nav buttons
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

  // flip <html> class so the frame shrinks/grows
  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
  }, [open]);

  // click anywhere on the page to close (outside the bar)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      // Only close if the click is inside the shrunken page/frame
      const frame = document.querySelector(".tester-frame");
      if (frame && frame.contains(e.target as Node)) {
        window.dispatchEvent(new Event("cove:menu:close"));
      }
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [open]);

  return (
    <>
      {/* 1) Orange backdrop under the frame */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "oklch(0.93 0.08 70)",
          opacity: open ? 1 : 0,
          transition: "opacity .25s ease",
          zIndex: 120, // behind the bands and the frame
          pointerEvents: "none",
        }}
      />

      {/* 2) Top band (real overlay bar) */}
      <div
        className="overlay-bands"
        style={{
          opacity: open ? 1 : 0,
          transition: "opacity .25s ease",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div className="overlay-top-band">
          <div className="overlay-top-inner">
            {/* LEFT SLOT */}
            <div className="overlay-slot-left">
              <Link href="/" className="overlay-logo">C O V E</Link>
              <Link href="/catalog" className="px-2 py-1 rounded-md hover:bg-black/5">
                Catalog
              </Link>
              <Link href="/orders" className="px-2 py-1 rounded-md hover:bg-black/5">
                My Orders
              </Link>
            </div>

            {/* CENTER SLOT (SearchBar fills the column) */}
            <div className="overlay-slot-center">
              <SearchBar />
            </div>

            {/* RIGHT SLOT */}
            <div className="overlay-slot-right">
              <RightActions />
              <button
                className="overlay-close"
                onClick={() => window.dispatchEvent(new Event("cove:menu:close"))}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}




// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";

// // Use your existing working actions (Sign in/out, cart, language, etc.)
// import RightActions from "@/src/components/Navbar/NavbarComponents/NavbarParts/RightActions";
// // Optional: plug your real components when ready
// // import LeftActions from "@/src/components/Navbar/NavbarComponents/NavbarParts/LeftActions";
// // import SearchBar from "@/src/components/Navbar/NavbarComponents/NavbarParts/SearchBar";

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

//   return (
//     <>
//       {/* 1) Orange backdrop under the frame */}
//       <div
//         aria-hidden
//         style={{
//           position: "fixed",
//           inset: 0,
//           background: "oklch(0.93 0.08 70)",
//           opacity: open ? 1 : 0,
//           transition: "opacity .25s ease",
//           zIndex: 120, // behind bands (180) and frame (200)
//           pointerEvents: "none",
//         }}
//       />

//       {/* 2) TOP band only (no left band) */}
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
//             {/* LEFT SLOT */}
//             <div className="overlay-slot-left">
//               {/* <LeftActions /> */}
//               <Link href="/" className="overlay-logo">C O V E</Link>
//             </div>

//             {/* CENTER SLOT (search stays centered and fills the middle column) */}
//             <div className="overlay-slot-center">
//               {/* <SearchBar /> */}
//               {/* Temporary placeholder — remove when you plug your real SearchBar */}
//               <div className="h-10 rounded-xl bg-black/10 w-full" />
//             </div>

//             {/* RIGHT SLOT */}
//             <div className="overlay-slot-right">
//               <RightActions />
//               <button
//                 className="overlay-close"
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
