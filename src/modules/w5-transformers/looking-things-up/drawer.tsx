import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: retrieval by meaning. */
export function LookDrawer() {
  return <DrawerText sections={words.drawer} />;
}
