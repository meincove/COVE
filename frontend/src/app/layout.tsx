
// working code

// import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
// import "./globals.css";

// import { ModalProvider } from '@/src/context/ModalContext';
// import Navbar from "@/src/components/Navbar";
// import ModalHost from "@/src/components/ModalHost";
// import { ThemeProvider } from "@/src/components/ThemeProvider"; // ✅ Import here

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export const metadata: Metadata = {
//   title: "Cove",
//   description: "Luxury meets tech.",
// };

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   return (
//     <html lang="en" suppressHydrationWarning>
//       <body
//         className={`${geistSans.variable} ${geistMono.variable} antialiased`}
//       >
       
//           <ModalProvider>
//             <Navbar />
//             <main className="pt-16">{children}</main>
//             <ModalHost />
//           </ModalProvider>
        
//       </body>
//     </html>
//   )
// }










import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

import { ModalProvider } from "@/src/context/ModalContext";
import Navbar from "@/src/components/Navbar";
import ModalHost from "@/src/components/ModalHost";
import { ThemeProvider } from "@/src/components/ThemeProvider";
import ChatWidget from "@/src/components/cove-ai/ChatWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cove",
  description: "Luxury meets tech.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <ThemeProvider>
            <ModalProvider>
              <Navbar />
              <main className="pt-16">{children}</main>
              <ModalHost />
            </ModalProvider>
          </ThemeProvider>
          {children}
          <ChatWidget />
        </body>
      </html>
    </ClerkProvider>
  );
}
