import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RushHosting",
  description: "Premium web hosting management — powered by RushHosting",
  authors: [{ name: "RushHosting" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" className={`${inter.className} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
