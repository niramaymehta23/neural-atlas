import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/design/fonts";
import { themeInitScript } from "@/design/theme";
import { CatalogPalette } from "./CatalogPalette";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neural Atlas",
  description: "Build a feel for how AI works by touching it.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <CatalogPalette />
      </body>
    </html>
  );
}
