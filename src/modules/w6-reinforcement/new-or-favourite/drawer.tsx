import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: epsilon-greedy, UCB and regret. */
export function CasinoDrawer() {
  return <DrawerText sections={words.drawer} />;
}
