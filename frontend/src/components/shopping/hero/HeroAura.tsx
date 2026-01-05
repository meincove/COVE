"use client"

export default function HeroAura({ active }: { active: boolean }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-20"
      style={{ opacity: active ? 1 : 0, transition: "opacity 180ms ease" }}
    >
      {/* BORDER-ONLY RING (never fills center) */}
      <div
        className="absolute inset-0 rounded-[32px]"
        style={{
          padding: 14,
          background:
            "conic-gradient(from 0deg, rgba(255,255,255,0) 0%, rgba(99,102,241,0.45) 16%, rgba(236,72,153,0.42) 36%, rgba(250,204,21,0.38) 56%, rgba(167,139,250,0.42) 76%, rgba(255,255,255,0) 100%)",
          animation: active ? "coveRingSpin 1.15s linear infinite" : "none",

          // only show border band using mask exclude
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          filter: "blur(10px)",
        }}
      />

      {/* EDGE SHIMMER (Gemini-like) */}
      <div
        className="absolute inset-[10px] rounded-[26px]"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(99,102,241,0.16) 25%, rgba(236,72,153,0.16) 50%, rgba(255,255,255,0) 75%, rgba(255,255,255,0) 100%)",
          backgroundSize: "220% 100%",
          animation: active ? "coveEdgeFlow 0.9s ease-in-out infinite" : "none",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: 14,
          filter: "blur(6px)",
          opacity: 0.9,
        }}
      />

      <style jsx global>{`
        @keyframes coveRingSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes coveEdgeFlow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  )
}
