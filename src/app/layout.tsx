import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/design/fonts";
import { themeInitScript } from "@/design/theme";
import { platformCaptions } from "@/platform/captions";
import { CatalogPalette } from "./CatalogPalette";
import "./globals.css";

export const metadata: Metadata = {
  title: platformCaptions.site.name,
  description: platformCaptions.site.description,
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
