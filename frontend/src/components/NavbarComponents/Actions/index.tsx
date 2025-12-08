// src/components/NavbarComponents/Actions/index.tsx
"use client";

import LanguageSwitch from "./LanguageSwitch";
import ThemeSwitch from "./ThemeSwitch";
import AuthControls from "./AuthControls";
import CartButton from "./CartButton";

export default function ActionsCluster() {
  return (
    <div className="flex items-center gap-2">
      <LanguageSwitch />
      <ThemeSwitch />
      <AuthControls />
      <CartButton />
    </div>
  );
}
