import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: next-letter practice from nothing. */
export function ReadingDrawer() {
  return <DrawerText sections={words.drawer} />;
}
