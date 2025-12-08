"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useIslandMenu } from "./islandMenuStore";

export default function MenuOverlay() {
  const { isOpen, close } = useIslandMenu();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  if (typeof document === "undefined") return null;
  if (!isOpen) return null;

  // Inline styles so we see it even if CSS didn’t load
  const perimeterPink = "#ffd1e6";
  const gapTop = 60;
  const gapSide = 20;
  const gapBottom = 20;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        pointerEvents: "none", // center passes through
      }}
      aria-modal="true"
      role="dialog"
    >
      {/* Center pass-through area */}
      <div
        style={{
          position: "absolute",
          top: gapTop,
          left: gapSide,
          right: gapSide,
          bottom: gapBottom,
          pointerEvents: "none",
        }}
      />

      {/* Top band (interactive) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: gapTop,
          background: perimeterPink,
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 16px",
          boxShadow: "0 8px 24px rgba(0,0,0,.12)",
          borderBottom: "1px solid rgba(0,0,0,.08)",
        }}
      >
        <button
          onClick={close}
          style={{
            padding: "8px 12px",
            borderRadius: 9999,
            border: "1px solid rgba(17,24,39,.15)",
            background: "rgba(17,24,39,.06)",
            color: "#111827",
            cursor: "pointer",
          }}
        >
          Close
        </button>
        <a href="/dashboard">Dashboard</a>
        <a href="/signin">Sign in</a>
        <a href="/">COVE</a>
      </div>

      {/* Left / Right / Bottom bands (interactive, empty for now) */}
      <div
        style={{
          position: "absolute",
          top: gapTop,
          bottom: gapBottom,
          left: 0,
          width: gapSide,
          background: perimeterPink,
          pointerEvents: "auto",
          borderRight: "1px solid rgba(0,0,0,.06)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: gapTop,
          bottom: gapBottom,
          right: 0,
          width: gapSide,
          background: perimeterPink,
          pointerEvents: "auto",
          borderLeft: "1px solid rgba(0,0,0,.06)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: gapBottom,
          background: perimeterPink,
          pointerEvents: "auto",
          borderTop: "1px solid rgba(0,0,0,.06)",
        }}
      />
    </div>,
    document.body
  );
}
