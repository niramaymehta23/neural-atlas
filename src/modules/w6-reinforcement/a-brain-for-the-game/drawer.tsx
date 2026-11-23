import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: a network that scores moves, a memory and a frozen copy. */
export function CatchDrawer() {
  return <DrawerText sections={words.drawer} />;
}
