"use client";
import { useSyncExternalStore } from "react";

let open = false;
const subs = new Set<() => void>();
const notify = () => subs.forEach((fn) => fn());

export function useMenuOverlay() {
  const isOpen = useSyncExternalStore(
    (cb) => { subs.add(cb); return () => subs.delete(cb); },
    () => open,
    () => false
  );
  const show = () => { if (!open) { open = true; notify(); } };
  const hide = () => { if (open)  { open = false; notify(); } };
  const toggle = () => { open = !open; notify(); };
  return { isOpen, show, hide, toggle };
}
