"use client";

import Link from "next/link";
import { PaletteTrigger } from "@/ui/PaletteTrigger";
import { ThemeSwitch } from "@/ui/ThemeSwitch";
import { platformCaptions } from "./captions";

type SiteNavProps = {
  /** The page it sits on; that page's own link is left out. */
  current: "home" | "lesson" | "puzzle" | "explore" | "other";
  className?: string;
};

const words = platformCaptions.nav;
const LINK =
  "inline-flex min-h-11 items-center text-sm text-accent-ink underline-offset-4 hover:underline md:min-h-0";

/** The way around the site on every page: back to the map, today's puzzle, find, page colour. */
export function SiteNav({ current, className = "" }: SiteNavProps) {
  return (
    <nav
      aria-label={words.label}
      className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${className}`}
    >
      {current !== "home" && (
        <Link href="/" className={LINK}>
          {words.home}
        </Link>
      )}
      {current !== "puzzle" && (
        <Link href="/puzzle" className={LINK}>
          {words.puzzle}
        </Link>
      )}
      {current !== "explore" && (
        <Link href="/explore" className={LINK}>
          {words.explore}
        </Link>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-3">
        <PaletteTrigger />
        <ThemeSwitch />
      </div>
    </nav>
  );
}
