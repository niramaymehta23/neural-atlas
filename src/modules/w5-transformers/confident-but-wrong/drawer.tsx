import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: why likely words are not true words. */
export function TruthDrawer() {
  return <DrawerText sections={words.drawer} />;
}
