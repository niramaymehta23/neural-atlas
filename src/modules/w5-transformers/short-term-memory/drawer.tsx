import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: the context window. */
export function MemoryDrawer() {
  return <DrawerText sections={words.drawer} />;
}
