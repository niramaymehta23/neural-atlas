import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: sine-wave order stamps. */
export function OrderDrawer() {
  return <DrawerText sections={words.drawer} />;
}
