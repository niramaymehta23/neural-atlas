"use client";

import { useRouter } from "next/navigation";
import { lessons } from "@/catalog";
import { CommandPalette } from "@/ui/CommandPalette";

// Searchable by everyday name or real term.
const ITEMS = lessons.map(({ id, title, realTerm }) => ({ id, label: title, hint: realTerm }));

/** Cmd/Ctrl+K on every page: jump to any lesson. */
export function CatalogPalette() {
  const router = useRouter();
  return (
    <div className="fixed right-4 bottom-4 z-20">
      <CommandPalette items={ITEMS} onSelect={(id) => router.push(`/learn/${id}`)} />
    </div>
  );
}
