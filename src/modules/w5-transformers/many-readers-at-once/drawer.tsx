import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: what a reader (attention head) is. */
export function ReadersDrawer() {
  return <DrawerText sections={words.drawer} />;
}
