import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider";
import { UserSync } from "@/components/UserSync";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mastermind",
  description: "AI tutor for working professionals",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Mastermind" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0F172A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" data-theme="dark" suppressHydrationWarning>
        <body>
          <ThemeProvider>
            <UserSync />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
