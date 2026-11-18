import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: the block, the shortcut and rank collapse. */
export function BlockDrawer() {
  return <DrawerText sections={words.drawer} />;
}
