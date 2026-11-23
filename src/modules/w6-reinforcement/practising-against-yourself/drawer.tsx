import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: how two copies learn from each other. */
export function PracticeDrawer() {
  return <DrawerText sections={words.drawer} />;
}
