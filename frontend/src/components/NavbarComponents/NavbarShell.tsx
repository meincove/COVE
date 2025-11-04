"use client";

import { motion } from "framer-motion";
import { LAYOUT_SPRING } from "./constants";
import React from "react";
import { useNavbarTheme } from "./ThemeScope";

type Props = React.PropsWithChildren<{ isIsland: boolean }>;

export default function NavbarShell({ isIsland, children }: Props) {
  const { theme } = useNavbarTheme();

  const palette =
    theme === "dark"
      ? {
          bg: "rgba(0,0,0,0.70)",
          fg: "#ffffff",
          border: "rgba(255,255,255,0.10)",
          shadow: "0 18px 40px rgba(0,0,0,0.45)",
        }
      : {
          bg: "rgba(255,255,255,0.80)",
          fg: "#0b0b0b",
          border: "rgba(0,0,0,0.10)",
          shadow: "0 16px 30px rgba(0,0,0,0.18)",
        };

  return (
    <motion.div
      id="cove-navbar-shell"
      layout
      transition={LAYOUT_SPRING}
      className={[
        "backdrop-blur-xl border overflow-hidden", // <-- prevent spill
        "h-14 md:h-16",
        isIsland
          ? "rounded-t-none rounded-b-2xl md:rounded-b-[28px] mx-auto"
          : "w-full max-w-none rounded-none mx-0",
      ].join(" ")}
      style={{
        position: "relative",
        left: 0,
        right: 0,
        paddingTop: "max(env(safe-area-inset-top), 0px)",
        background: palette.bg,
        color: palette.fg,
        borderColor: palette.border,
        boxShadow: palette.shadow,
        width: isIsland ? "clamp(280px, 30vw, 560px)" : undefined,
      }}
    >
      {children}
    </motion.div>
  );
}
