import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: a player, a coach and a rail on each change. */
export function CoachDrawer() {
  return <DrawerText sections={words.drawer} />;
}
