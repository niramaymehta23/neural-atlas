import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: why food later counts for less. */
export function NowDrawer() {
  return <DrawerText sections={words.drawer} />;
}
