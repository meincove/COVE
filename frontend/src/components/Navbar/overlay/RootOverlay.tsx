
// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";

// // Use your existing working actions (Sign in/out, etc.)
// import RightActions from "@/src/components/Navbar/NavbarComponents/NavbarParts/RightActions";

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

//   // Flip class on <html> so CSS can scale the tester frame
//   useEffect(() => {
//     document.documentElement.classList.toggle("menu-open", open);
//   }, [open]);

//   return (
//     <>
//       {/* 1) Orange backdrop UNDER the frame */}
//       <div
//         aria-hidden
//         style={{
//           position: "fixed",
//           inset: 0,
//           background: "oklch(0.93 0.08 70)",
//           opacity: open ? 1 : 0,
//           transition: "opacity .25s ease",
//           zIndex: 120,                // behind bands (180) and frame (200)
//           pointerEvents: "none",
//         }}
//       />

//       {/* 2) Bands (real containers behind the frame) */}
//       <div
//         className="overlay-bands"
//         style={{
//           opacity: open ? 1 : 0,
//           transition: "opacity .25s ease",
//           pointerEvents: open ? "auto" : "none",
//         }}
//       >
//         {/* TOP BAND — fills the revealed top gap */}
//         <div className="overlay-top-band">
//           <div className="overlay-top-inner">
//             <div className="flex items-center gap-3">
//               <Link href="/" className="font-semibold tracking-[0.24em]">
//                 C O V E
//               </Link>
//               {/* put any left-side links if needed */}
//             </div>

//             <div className="flex items-center gap-2">
//               <RightActions />
//               <button
//                 className="px-3 py-1.5 rounded-xl bg-black text-white"
//                 onClick={() => window.dispatchEvent(new Event("cove:menu:close"))}
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* LEFT BAND — vertical strip filling the revealed left gap */}
//         <div className="overlay-left-band">
//           <div className="overlay-left-inner">
//             {/* Example vertical nav; replace with your real items/components */}
//             <span className="mb-4">Experience</span>
//             <span className="mb-4">Technology</span>
//             <span className="mb-4">Discover</span>
//             <span>Watch</span>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }




// src/components/Navbar/overlay/RootOverlay.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Use your existing working actions (Sign in/out, cart, language, etc.)
import RightActions from "@/src/components/Navbar/NavbarComponents/NavbarParts/RightActions";
// Optional: plug your real components when ready
// import LeftActions from "@/src/components/Navbar/NavbarComponents/NavbarParts/LeftActions";
// import SearchBar from "@/src/components/Navbar/NavbarComponents/NavbarParts/SearchBar";

export default function RootOverlay() {
  const [open, setOpen] = useState(false);

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

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
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
          zIndex: 120, // behind bands (180) and frame (200)
          pointerEvents: "none",
        }}
      />

      {/* 2) TOP band only (no left band) */}
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
              {/* <LeftActions /> */}
              <Link href="/" className="overlay-logo">C O V E</Link>
            </div>

            {/* CENTER SLOT (search stays centered and fills the middle column) */}
            <div className="overlay-slot-center">
              {/* <SearchBar /> */}
              {/* Temporary placeholder — remove when you plug your real SearchBar */}
              <div className="h-10 rounded-xl bg-black/10 w-full" />
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
