// "use client";

// import { useScrollPhase } from "@/src/hooks/useScrollPhase";

// export default function ScrollHUD({ devOnly = true }: { devOnly?: boolean }) {
//   if (devOnly && process.env.NODE_ENV !== "development") return null;

//   const { phase, scrollTop, scrollMax, progress } = useScrollPhase({
//     selector: ".tester-frame",
//     topThreshold: 100,
//     bottomThreshold: 100,
//     hysteresis: 60,
//   });

//   return (
//     <div
//       style={{
//         position: "fixed",
//         inset: 0,
//         pointerEvents: "none",
//         zIndex: 9999,
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//       }}
//       aria-hidden
//     >
//       <div
//         style={{
//           pointerEvents: "auto",
//           padding: "10px 14px",
//           borderRadius: 12,
//           background: "rgba(250,250,250,.9)",
//           boxShadow: "0 12px 40px rgba(0,0,0,.25)",
//           border: "1px solid rgba(0,0,0,.08)",
//           fontFamily: "ui-sans-serif, system-ui",
//           display: "flex",
//           alignItems: "center",
//           gap: 10,
//         }}
//       >
//         <Badge active={phase === "top"}>TOP</Badge>
//         <Badge active={phase === "mid"}>MID</Badge>
//         <Badge active={phase === "bottom"}>BOTTOM</Badge>

//         <div style={{ width: 1, height: 20, background: "rgba(0,0,0,.12)" }} />

//         <span style={{ fontVariantNumeric: "tabular-nums" }}>
//           scrollTop: {Math.round(scrollTop)}
//         </span>
//         <span style={{ fontVariantNumeric: "tabular-nums" }}>
//           max: {Math.max(0, Math.round(scrollMax))}
//         </span>
//         <span style={{ fontVariantNumeric: "tabular-nums" }}>
//           progress: {(progress * 100).toFixed(1)}%
//         </span>
//       </div>
//     </div>
//   );
// }

// function Badge({ active, children }: { active: boolean; children: React.ReactNode }) {
//   return (
//     <span
//       style={{
//         padding: "4px 8px",
//         borderRadius: 8,
//         fontWeight: 600,
//         background: active ? "oklch(0.95 0.02 95)" : "oklch(0.98 0 0)",
//         border: `1px solid ${active ? "oklch(0.78 0.02 95)" : "rgba(0,0,0,.08)"}`,
//         color: "#0b0b0b",
//       }}
//     >
//       {children}
//     </span>
//   );
// }


// src/components/dev/ScrollHUD.tsx
"use client";
import { useEffect, useState } from "react";
import { useScrollContainer } from "@/src/hooks/useScrollContainer";

export default function ScrollHUD({ containerSel = ".tester-frame" }: { containerSel?: string }) {
  const el = useScrollContainer(containerSel);
  const [state, setState] = useState({ top: 0, max: 1, progress: 0 });

  useEffect(() => {
    if (!el) return;
    const update = () => {
      const top = el.scrollTop;
      const max = Math.max(1, el.scrollHeight - el.clientHeight);
      const progress = Math.min(1, Math.max(0, top / max));
      setState({ top, max, progress });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [el]);

  return (
    <div style={{
      position: "fixed", right: 16, bottom: 16, zIndex: 60,
      background: "rgba(0,0,0,.6)", color: "#fff",
      padding: "8px 12px", borderRadius: 10, fontSize: 12, backdropFilter: "blur(6px)"
    }}>
      <div>scrollTop: {Math.round(state.top)}</div>
      <div>max: {Math.round(state.max)}</div>
      <div>progress: {(state.progress * 100).toFixed(1)}%</div>
    </div>
  );
}
