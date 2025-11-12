// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

import RootOverlay from "@/src/components/Navbar/overlay/RootOverlay";
import ModalHost from "@/src/components/ModalHost";
import { ModalProvider } from "@/src/context/ModalContext";
import { ThemeProvider } from "@/src/components/ThemeProvider";
import ChatWidget from "@/src/components/cove-ai/ChatWidget";
import IslandDevToggle from "@/src/components/dev/IslandDevToggle";
import NavbarController from "../components/Navbar/NavbarController";
import ScrollHUD from "@/src/components/dev/ScrollHUD";

export const metadata: Metadata = {
  title: "Cove",
  description: "Luxury meets tech.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" suppressHydrationWarning>
        <body className="antialiased">
          <ThemeProvider>
            <ModalProvider>
              {/* Keep global overlay if it needs to darken background on menu */}
              <RootOverlay />

              {/* Render the actual pages; no navbar or tester-frame here */}
              {/* {children} */}
              <div className="tester-frame"> <NavbarController /> <main>{children}</main> </div>

              <ModalHost />
              {/* <ScrollHUD devOnly /> */}
            </ModalProvider>
          </ThemeProvider>

          <ChatWidget />
          {process.env.NODE_ENV === "development" && <IslandDevToggle />}
        </body>
      </html>
    </ClerkProvider>
  );
}
