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
import NavbarController from "@/src/components/Navbar/NavbarController";
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
              <RootOverlay />

              {/* SINGLE scroll container for everything */}
              <div className="tester-frame h-screen w-full overflow-y-auto overflow-x-hidden">
                <NavbarController />
                <main>{children}</main>
              </div>

              <ModalHost />
              <ScrollHUD />
            </ModalProvider>
          </ThemeProvider>

          <ChatWidget />
          {process.env.NODE_ENV === "development" && <IslandDevToggle />}
        </body>
      </html>
    </ClerkProvider>
  );
}












// import type { Metadata } from "next";
// import "./globals.css";
// import { ClerkProvider } from "@clerk/nextjs";
// import { dark } from "@clerk/themes";

// import RootOverlay from "@/src/components/Navbar/overlay/RootOverlay";
// import ModalHost from "@/src/components/ModalHost";
// import { ModalProvider } from "@/src/context/ModalContext";
// import { ThemeProvider } from "@/src/components/ThemeProvider";
// import ChatWidget from "@/src/components/cove-ai/ChatWidget";
// import IslandDevToggle from "@/src/components/dev/IslandDevToggle";
// import NavbarController from "@/src/components/Navbar/NavbarController";
// import ScrollHUD from "@/src/components/dev/ScrollHUD";

// export const metadata: Metadata = {
//   title: "Cove",
//   description: "Luxury meets tech.",
// };

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <ClerkProvider appearance={{ baseTheme: dark }}>
//       <html lang="en" suppressHydrationWarning>
//         <body className="antialiased">
//           <ThemeProvider>
//             <ModalProvider>
//               <RootOverlay />

//               {/* SINGLE scroll container for the whole app */}
//               <div className="tester-frame h-screen w-full overflow-y-auto overflow-x-hidden">
//                 <NavbarController />
//                 <main>{children}</main>
//               </div>

//               <ModalHost />
//               <ScrollHUD  />
//             </ModalProvider>
//           </ThemeProvider>

//           <ChatWidget />
//           {process.env.NODE_ENV === "development" && <IslandDevToggle />}
//         </body>
//       </html>
//     </ClerkProvider>
//   );
// }
