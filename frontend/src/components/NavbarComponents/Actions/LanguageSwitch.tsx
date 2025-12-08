// src/components/NavbarComponents/Actions/LanguageSwitch.tsx
"use client";

import { useState } from "react";

export default function LanguageSwitch() {
  // simple stub; wire to next-intl / cookies later
  const [lang, setLang] = useState<"en" | "de">("en");
  return (
    <button
      aria-label="Language"
      onClick={() => setLang((l) => (l === "en" ? "de" : "en"))}
      className="rounded-lg px-2 py-1 text-xs text-white/80 hover:text-white hover:bg-white/5 transition"
      title={`Language: ${lang.toUpperCase()}`}
    >
      {lang.toUpperCase()}
    </button>
  );
}
