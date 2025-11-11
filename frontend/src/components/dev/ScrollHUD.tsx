"use client";

import { useScrollPhase } from "@/src/hooks/useScrollPhase";

export default function ScrollHUD({ devOnly = true }: { devOnly?: boolean }) {
  if (devOnly && process.env.NODE_ENV !== "development") return null;

  const { phase, scrollTop, scrollMax, progress } = useScrollPhase({
    selector: ".tester-frame",
    topThreshold: 100,
    bottomThreshold: 100,
    hysteresis: 60,
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-hidden
    >
      <div
        style={{
          pointerEvents: "auto",
          padding: "10px 14px",
          borderRadius: 12,
          background: "rgba(250,250,250,.9)",
          boxShadow: "0 12px 40px rgba(0,0,0,.25)",
          border: "1px solid rgba(0,0,0,.08)",
          fontFamily: "ui-sans-serif, system-ui",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Badge active={phase === "top"}>TOP</Badge>
        <Badge active={phase === "mid"}>MID</Badge>
        <Badge active={phase === "bottom"}>BOTTOM</Badge>

        <div style={{ width: 1, height: 20, background: "rgba(0,0,0,.12)" }} />

        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          scrollTop: {Math.round(scrollTop)}
        </span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          max: {Math.max(0, Math.round(scrollMax))}
        </span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          progress: {(progress * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function Badge({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 8,
        fontWeight: 600,
        background: active ? "oklch(0.95 0.02 95)" : "oklch(0.98 0 0)",
        border: `1px solid ${active ? "oklch(0.78 0.02 95)" : "rgba(0,0,0,.08)"}`,
        color: "#0b0b0b",
      }}
    >
      {children}
    </span>
  );
}
