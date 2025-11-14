// src/components/Navbar/NavbarComponents/NavbarParts/LeftActions.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CoveTiltButton from "@/src/components/ui/Button/CoveTiltButton";
import { useState } from "react";

export default function LeftActions() {
  const pathname = usePathname();
  const router = useRouter();
   const [selected, setSelected] = useState<"tester" | "hello" | null>(null);

  const go = (path: string) => {
    // navigate but DO NOT close the overlay
    router.push(path);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 min-w-0 w-full">
  <Link href="/" className="overlay-logo shrink-0">C O V E</Link>
  <div className="flex items-center gap-3 min-w-0 flex-1">
    <CoveTiltButton as="button" fluid active={pathname?.startsWith("/catalog")} onClick={() => router.push("/catalog")}>
      Catalog
    </CoveTiltButton>
    <CoveTiltButton as="button" fluid active={pathname?.startsWith("/orders")} onClick={() => router.push("/orders")}>
      My Orders
    </CoveTiltButton>
  </div>
</div>

  );
}
