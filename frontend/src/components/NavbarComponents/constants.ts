
export const ISLAND_THRESHOLD = 0.6;
export const LAYOUT_SPRING = { type: "spring", stiffness: 360, damping: 30 } as const;

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catalog" },
  { href: "/tiers", label: "Tiers" },
  { href: "/about", label: "About" },
] as const;
