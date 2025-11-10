// src/components/NavbarComponents/islandMenuStore.ts
"use client";
import { useEffect, useSyncExternalStore } from "react";

let __menuOpen = false;
const __subs = new Set<() => void>();
const notify = () => __subs.forEach((fn) => fn());
const subscribe = (fn: () => void) => { __subs.add(fn); return () => __subs.delete(fn); };
const getSnapshot = () => __menuOpen;

export function useIslandMenu() {
  const isOpen = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const open   = () => { if (!__menuOpen) { __menuOpen = true;  notify(); } };
  const close  = () => { if (__menuOpen)  { __menuOpen = false; notify(); } };
  const toggle = () => { __menuOpen = !__menuOpen; notify(); };

// 🔵 Mirror state to <html> as a class + set CSS vars for gaps (MUST match globals.css)
useEffect(() => {
  const html = document.documentElement;

  if (isOpen) {
    html.classList.add("frame-open");

    // these names MUST match the ones used in globals.css
    html.style.setProperty("--frame-gap-top", "60px");
    html.style.setProperty("--frame-gap-right", "20px");
    html.style.setProperty("--frame-gap-bottom", "20px");
    html.style.setProperty("--frame-gap-left", "20px");
  } else {
    html.classList.remove("frame-open");

    html.style.removeProperty("--frame-gap-top");
    html.style.removeProperty("--frame-gap-right");
    html.style.removeProperty("--frame-gap-bottom");
    html.style.removeProperty("--frame-gap-left");
  }
}, [isOpen]);


  // keep your window event API intact
  useEffect(() => {
    const onToggle = () => toggle();
    const onOpen   = () => open();
    const onClose  = () => close();
    window.addEventListener("cove:island:menu:toggle", onToggle);
    window.addEventListener("cove:island:menu:open",   onOpen);
    window.addEventListener("cove:island:menu:close",  onClose);
    return () => {
      window.removeEventListener("cove:island:menu:toggle", onToggle);
      window.removeEventListener("cove:island:menu:open",   onOpen);
      window.removeEventListener("cove:island:menu:close",  onClose);
    };
  }, []);

  return { isOpen, open, close, toggle };
}
