import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amharic Light Stemmer",
  description:
    "A simplified Alemayehu-style Amharic light stemmer for normalization, prefix stripping, suffix stripping, and limited plural recoding."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
