// src/components/NavbarComponents/Actions/AuthControls.tsx
"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function AuthControls() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="rounded-lg px-2 py-1 text-xs text-white/80 hover:text-white hover:bg-white/5 transition">
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="rounded-lg px-2 py-1 text-xs text-white/80 hover:text-white hover:bg-white/5 transition">
            Sign Up
          </button>
        </SignUpButton>
      </SignedOut>

      <SignedIn>
        <Link href="/orders" className="hidden md:inline text-sm text-white/85 hover:text-white">
          My Orders
        </Link>
        <Link href="/dashboard" className="hidden md:inline text-sm text-white/85 hover:text-white">
          Dashboard
        </Link>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}
