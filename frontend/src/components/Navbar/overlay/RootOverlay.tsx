
// "use client";

// import { useEffect, useMemo, useState } from "react";
// import LeftActions from "@/src/components/Navbar/NavbarComponents/NavbarParts/LeftActions";
// import RightActions from "@/src/components/Navbar/NavbarComponents/NavbarParts/RightActions";
// import SearchBar from "@/src/components/Navbar/NavbarComponents/NavbarParts/SearchBar";

// const DEV_FLAG_KEY = "cove:overlayDebug";

// export default function RootOverlay() {
//   const [open, setOpen] = useState(false);
//   const [devOnly, setDevOnly] = useState(false);

//   // Open / close via custom events
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

//   // Toggle html.menu-open → shrinks tester-frame
//   useEffect(() => {
//     if (devOnly) return;
//     document.documentElement.classList.toggle("menu-open", open);
//   }, [open, devOnly]);

//   // Dev-only overlay mode (overlayOnly=1 or persisted flag)
//   useEffect(() => {
//     const hasQuery =
//       typeof window !== "undefined" &&
//       new URLSearchParams(window.location.search).get("overlayOnly") === "1";

//     const saved =
//       typeof window !== "undefined" &&
//       localStorage.getItem(DEV_FLAG_KEY) === "1";

//     if (hasQuery || saved) {
//       setDevOnly(true);
//       setOpen(true);
//       document.documentElement.classList.add("overlay-dev");
//     }
//   }, []);

//   // Keyboard toggle for dev mode (Ctrl+Shift+O)
//   useEffect(() => {
//     const onKey = (e: KeyboardEvent) => {
//       if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "o") {
//         const next = !devOnly;
//         setDevOnly(next);

//         if (next) {
//           localStorage.setItem(DEV_FLAG_KEY, "1");
//           setOpen(true);
//           document.documentElement.classList.add("overlay-dev");
//         } else {
//           localStorage.removeItem(DEV_FLAG_KEY);
//           document.documentElement.classList.remove("overlay-dev");
//         }
//       }
//     };

//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [devOnly]);

//   // Click inside tester-frame closes the menu (normal mode only)
//   useEffect(() => {
//     if (!open || devOnly) return;

//     const handler = (e: MouseEvent) => {
//       const frame = document.querySelector(".tester-frame");
//       if (frame && frame.contains(e.target as Node)) {
//         window.dispatchEvent(new Event("cove:menu:close"));
//       }
//     };

//     document.addEventListener("mousedown", handler, true);
//     return () => document.removeEventListener("mousedown", handler, true);
//   }, [open, devOnly]);

//   const rootStyle = useMemo(
//     () => ({
//       opacity: devOnly ? 1 : open ? 1 : 0,
//       transition: devOnly ? "none" : "opacity .25s ease",
//     }),
//     [open, devOnly]
//   );

//   return (
//     <>
//       {/* Peach global backdrop tint */}
//       <div
//         aria-hidden
//         style={{
//           position: "fixed",
//           inset: 0,
//           background: "oklch(0.93 0.08 70)",
//           opacity: devOnly ? 1 : open ? 1 : 0,
//           transition: devOnly ? "none" : "opacity .25s ease",
//           zIndex: 120,
//           pointerEvents: "none",
//         }}
//       />

//       {/* Main overlay bar: width + position handled entirely by CSS */}
//       <div className="overlay-root" style={rootStyle as React.CSSProperties}>
//         <div className="overlay-stage">
//           <div className="overlay-card overlay-card--thirds">
//             {/* LEFT SLOT */}
//             <div
//               className="overlay-slot-left"
//               style={{
//                 background: "rgba(255,182,193,.28)", // light pink
//                 borderRadius: 10,
//               }}
//             >
//               <LeftActions />
//             </div>

//             {/* CENTER SLOT */}
//             <div
//               className="overlay-slot-center"
//               style={{
//                 background: "rgba(186, 170, 255, .22)", // light violet
//                 borderRadius: 10,
//               }}
//             >
//               <SearchBar />
//             </div>

//             {/* RIGHT SLOT */}
//             <div
//               className="overlay-slot-right justify-end md:justify-end"
//               style={{
//                 background: "rgba(255,182,193,.28)", // light pink
//                 borderRadius: 10,
//               }}
//             >
//               <RightActions />
//               <button
//                 className="overlay-close"
//                 onClick={() => {
//                   if (devOnly) {
//                     localStorage.removeItem(DEV_FLAG_KEY);
//                     document.documentElement.classList.remove("overlay-dev");
//                     setDevOnly(false);
//                   } else {
//                     window.dispatchEvent(new Event("cove:menu:close"));
//                   }
//                 }}
//                 style={{
//                   background: "#e11d48",
//                   color: "white",
//                   padding: "8px 12px",
//                   borderRadius: 12,
//                 }}
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Small dev badge */}
//       {devOnly && (
//         <div
//           style={{
//             position: "fixed",
//             right: 12,
//             bottom: 12,
//             zIndex: 9999,
//             background: "black",
//             color: "white",
//             padding: "6px 10px",
//             borderRadius: 10,
//             opacity: 0.75,
//           }}
//         >
//           Overlay Dev (Ctrl+Shift+O)
//         </div>
//       )}
//     </>
//   );
// }


// src/components/Overlay/RootOverlay.tsx
// "use client";

// import { useEffect, useMemo, useState } from "react";
// import LeftActions from "@/src/components/Navbar/NavbarComponents/NavbarParts/LeftActions";
// import RightActions from "@/src/components/Navbar/NavbarComponents/NavbarParts/RightActions";
// import SearchBar from "@/src/components/Navbar/NavbarComponents/NavbarParts/SearchBar";

// const DEV_FLAG_KEY = "cove:overlayDebug";

// export default function RootOverlay() {
//   const [open, setOpen] = useState(false);
//   const [devOnly, setDevOnly] = useState(false);

//   // Open / close via custom events
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

//   // Toggle html.menu-open → shrinks tester-frame
//   useEffect(() => {
//     if (devOnly) return;
//     document.documentElement.classList.toggle("menu-open", open);
//   }, [open, devOnly]);

//   // Dev-only overlay mode (overlayOnly=1 or persisted flag)
//   useEffect(() => {
//     const hasQuery =
//       typeof window !== "undefined" &&
//       new URLSearchParams(window.location.search).get("overlayOnly") === "1";

//     const saved =
//       typeof window !== "undefined" &&
//       localStorage.getItem(DEV_FLAG_KEY) === "1";

//     if (hasQuery || saved) {
//       setDevOnly(true);
//       setOpen(true);
//       document.documentElement.classList.add("overlay-dev");
//     }
//   }, []);

//   // Keyboard toggle for dev mode (Ctrl+Shift+O)
//   useEffect(() => {
//     const onKey = (e: KeyboardEvent) => {
//       if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "o") {
//         const next = !devOnly;
//         setDevOnly(next);

//         if (next) {
//           localStorage.setItem(DEV_FLAG_KEY, "1");
//           setOpen(true);
//           document.documentElement.classList.add("overlay-dev");
//         } else {
//           localStorage.removeItem(DEV_FLAG_KEY);
//           document.documentElement.classList.remove("overlay-dev");
//         }
//       }
//     };

//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [devOnly]);

//   // Click inside tester-frame closes the menu (normal mode only)
//   useEffect(() => {
//     if (!open || devOnly) return;

//     const handler = (e: MouseEvent) => {
//       const frame = document.querySelector(".tester-frame");
//       if (frame && frame.contains(e.target as Node)) {
//         window.dispatchEvent(new Event("cove:menu:close"));
//       }
//     };

//     document.addEventListener("mousedown", handler, true);
//     return () => document.removeEventListener("mousedown", handler, true);
//   }, [open, devOnly]);

//   const rootStyle = useMemo(
//     () => ({
//       opacity: devOnly ? 1 : open ? 1 : 0,
//       transition: devOnly ? "none" : "opacity .25s ease",
//     }),
//     [open, devOnly]
//   );

//   return (
//     <>


//       {/* Main overlay bar: width + position handled entirely by CSS */}
//       <div className="overlay-root" style={rootStyle as React.CSSProperties}>
//         <div className="overlay-stage">
//           <div className="overlay-card overlay-card--thirds">
//             {/* LEFT SLOT */}
//             <div className="overlay-slot-left">
//               <LeftActions />
//             </div>

//             {/* CENTER SLOT */}
//             <div className="overlay-slot-center">
//               <SearchBar />
//             </div>

//             {/* RIGHT SLOT */}
//             <div className="overlay-slot-right justify-end md:justify-end">
//               <RightActions />
//               <button
//                 className="overlay-close"
//                 onClick={() => {
//                   if (devOnly) {
//                     localStorage.removeItem(DEV_FLAG_KEY);
//                     document.documentElement.classList.remove("overlay-dev");
//                     setDevOnly(false);
//                   } else {
//                     window.dispatchEvent(new Event("cove:menu:close"));
//                   }
//                 }}
//                 style={{
//                   background: "#e11d48",
//                   color: "white",
//                   padding: "8px 12px",
//                   borderRadius: 12,
//                 }}
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Small dev badge */}
//       {devOnly && (
//         <div
//           style={{
//             position: "fixed",
//             right: 12,
//             bottom: 12,
//             zIndex: 9999,
//             background: "black",
//             color: "white",
//             padding: "6px 10px",
//             borderRadius: 10,
//             opacity: 0.75,
//           }}
//         >
//           Overlay Dev (Ctrl+Shift+O)
//         </div>
//       )}
//     </>
//   );
// }
