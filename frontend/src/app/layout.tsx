import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synapse War Room",
  description: "Your AI curriculum tutor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
