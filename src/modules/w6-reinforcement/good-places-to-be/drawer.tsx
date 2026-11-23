import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: how the glow spreads. */
export function GlowDrawer() {
  return <DrawerText sections={words.drawer} />;
}
