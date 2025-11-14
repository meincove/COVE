

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";

type ButtonAs =
  | (React.ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button" })
  | (React.AnchorHTMLAttributes<HTMLAnchorElement> & { as: "a"; href: string })
  | ({ as: "link"; href: string; prefetch?: boolean });

type Props = ButtonAs & {
  children: React.ReactNode;
  /** Selected/pressed state */
  active?: boolean;
  /** Make button fill its parent’s width */
  fluid?: boolean;
  /** Extra classes for the OUTER wrapper (spacing/layout only) */
  className?: string;
};

const BLUE = "#1434A4";

export default function CoveTiltButton({
  as = "button",
  active = false,
  fluid = false,
  className,
  children,
  ...rest
}: Props) {
  // OUTER: perspective + tiny spread so base shows as a rim

  const widthCls = fluid
    ? "w-full"
    : "w-[clamp(160px,22vw,240px)] min-w-[150px]";

  const outer = clsx(
    "relative align-middle",
    fluid ? "block" : "inline-block",
    "[perspective:1000px]",
    widthCls,
    className
  );

  // BASE/platform (fills container)
  const baseLayer = clsx(
    "absolute inset-0 rounded-[10px] transition-colors duration-200",
    active ? "bg-[#1434A4]" : "bg-black"
  );

  // TOP PILL core styles (width responsive by default; overridable via parent)
  const topPillBase =
    // "relative inline-flex items-center justify-center select-none text-[0.98rem] " +
    "relative flex w-full items-center justify-center select-none text-[0.98rem] " +
    "rounded-[8px]  dark:border-white/15 " +
    "bg-white text-black " +
    "shadow-[0_10px_24px_rgba(0,0,0,0.12)] backdrop-blur " +
    "transition-[transform,box-shadow,color,background,border] duration-200 ease-out " +
    // width & padding (responsive clamp; feels natural at different breakpoints)
    (fluid
      ? "w-full px-4 py-2.5 md:px-5 md:py-3"
      : "w-[clamp(160px,22vw,240px)] min-w-[150px] px-4 py-2.5 md:px-5 md:py-3");

  // ACTIVE mods: straight lift + blue text + subtle shadow
  const topPillActive =
    `-translate-y-[6px] text-[${BLUE}] border-[${BLUE}] border-opacity-40 ` +
    "shadow-[0_14px_28px_rgba(0,0,0,0.16)]";

  // element selection
  const content =
    as === "button" ? (
      <button className={clsx(topPillBase, active && topPillActive)} {...(rest as any)}>
        {children}
      </button>
    ) : as === "a" ? (
      <a className={clsx(topPillBase, active && topPillActive)} {...(rest as any)}>
        {children}
      </a>
    ) : (
      <Link className={clsx(topPillBase, active && topPillActive)} {...(rest as any)}>
        {children}
      </Link>
    );

  // Motion: we keep a single wrapper so the behavior is identical for links/buttons.
  // Hover: hinge at TOP-LEFT so the right side lifts (no state jump).
  // Active: no hinge; just the lifted pose.
  return (
    <span className={outer}>
      <span aria-hidden className={baseLayer} />

      <motion.span
  className="block w-full"
  initial={false}                       // ← prevent “snap back” on state change
  variants={{
    idle:   { rotateX: 0,  rotateY: 0,  y: 0 },
    active: { rotateX: 0,  rotateY: 0,  y: -6 },
    hover:  { rotateX: -6, rotateY: 10, y: -4 },   // true 3D lift
  }}
  animate={active ? "active" : "idle"}
  whileHover={active ? undefined : "hover"}
  whileTap={active ? { scale: 1 } : { y: -2, scale: 0.99 }}
  style={{ transformOrigin: active ? "30% 30%" : "0% 100%" }} // hinge top-left when idle
  transition={{ type: "spring", stiffness: 520, damping: 24, mass: 0.18 }}
>
  {content}
</motion.span>


      {/* <motion.span
        // className={fluid ? "block" : "inline-block"}
        className="block w-full"
        style={{ transformOrigin: active ? "30% 30%" : "0% 0%" }} // top-left when idle, neutral when active
        animate={active ? { rotateX: 0, rotateY: 0, y: -6 } : { rotateX: 0, rotateY: 0, y: 0 }}
        whileHover={active ? undefined : { rotateX: 0, rotateY: 0, y: 10, z:10 }}
        whileTap={active ? { scale: 1 } : { rotateX: 0, rotateY: 0, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 20, mass: 0.12 }}
      >
        {content}
      </motion.span> */}
    </span>
  );
}
