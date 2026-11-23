import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: how pretend games choose a move. */
export function AheadDrawer() {
  return <DrawerText sections={words.drawer} />;
}
