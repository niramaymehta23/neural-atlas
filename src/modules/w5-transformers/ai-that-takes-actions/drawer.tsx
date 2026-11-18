import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: the agent loop. */
export function AgentDrawer() {
  return <DrawerText sections={words.drawer} />;
}
