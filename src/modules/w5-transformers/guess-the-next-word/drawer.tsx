import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: next-word prediction and greedy picking. */
export function NextDrawer() {
  return <DrawerText sections={words.drawer} />;
}
