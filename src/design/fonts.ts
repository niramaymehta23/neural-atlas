import { Fraunces, Inter } from "next/font/google";

// Self-hosted at build time by next/font, so fonts never break cross-origin isolation.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const fontVariables = `${fraunces.variable} ${inter.variable}`;
