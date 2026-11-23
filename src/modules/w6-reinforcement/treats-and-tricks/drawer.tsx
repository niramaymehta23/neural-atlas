import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: liking, treats and the gradient bandit. */
export function TreatsDrawer() {
  return <DrawerText sections={words.drawer} />;
}
