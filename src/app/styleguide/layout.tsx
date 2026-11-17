import type { Metadata } from "next";
import type { ReactNode } from "react";

/** Evidence pages for builders: kept out of search results. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function StyleguideLayout({ children }: { children: ReactNode }) {
  return children;
}
