// import type { Metadata } from "next";
// import "./globals.css";
// import { ClerkProvider } from "@clerk/nextjs";
// import { dark } from "@clerk/themes";

// // import RootOverlay from "@/components/Navbar/overlay/RootOverlay";
// import ModalHost from "@/components/ModalHost";
// import { ModalProvider } from "@/context/ModalContext";
// import { ThemeProvider } from "@/components/ThemeProvider";
// import FloatingChatbot from "@/components/cove-ai/FloatingChatbot";
// import AnalyticsInit from "@/components/AnalyticsInit"; // Analytics tracking


// import IslandDevToggle from "@/components/dev/IslandDevToggle";
// import NavbarController from "@/components/Navbar/NavbarController";

// export const metadata: Metadata = {
//   title: "Cove",
//   description: "Luxury meets tech.",
// };

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <ClerkProvider appearance={{ baseTheme: dark }}>
//       <html lang="en" suppressHydrationWarning>
//         <body className="antialiased" suppressHydrationWarning>
//           <ThemeProvider>
//             <AnalyticsInit /> {/* Initialize analytics tracking */}
//             <ModalProvider>
//               {/* <RootOverlay /> */}

//               {/* SINGLE scroll container for everything */}
//               <div className="tester-frame h-screen w-full overflow-y-auto overflow-x-hidden">
//                 {/* <NavbarController /> */}
//                 <main>{children}</main>
//               </div>

//               {/* NEW: Stunning Floating AI Chatbot – visible on ALL pages! */}
//               <FloatingChatbot />

//               <ModalHost />
//             </ModalProvider>
//           </ThemeProvider>
//         </body>
//       </html>
//     </ClerkProvider>
//   );
// }



import type { Metadata } from "next"
import "./globals.css"
import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"

import ModalHost from "@/components/ModalHost"
import { ModalProvider } from "@/context/ModalContext"
import { AuthModalProvider } from "@/context/AuthModalContext"
import AuthModal from "@/components/auth/AuthModal"
import { ThemeProvider } from "@/components/ThemeProvider"
import FloatingChatbot from "@/components/cove-ai/FloatingChatbot"
import AnalyticsInit from "@/components/AnalyticsInit"
import NavbarController from "@/components/Navbar/NavbarController"

export const metadata: Metadata = {
  title: "Cove",
  description: "Luxury meets tech.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" suppressHydrationWarning className="h-full">
        <body className="h-[100dvh] overflow-hidden antialiased" suppressHydrationWarning>
          <ThemeProvider>
            <AnalyticsInit />
            <AuthModalProvider>
              <ModalProvider>
                {/* ✅ Single scroll root for the whole app */}
                <div className="tester-frame relative h-[100dvh] w-full overflow-y-auto overflow-x-hidden">
                  <NavbarController>
                    <main className="overflow-visible">{children}</main>
                  </NavbarController>
                </div>

                <FloatingChatbot />
                <ModalHost />
                <AuthModal />
              </ModalProvider>
            </AuthModalProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
