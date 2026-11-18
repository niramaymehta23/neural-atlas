import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: the Chinchilla scaling law. */
export function ScaleDrawer() {
  return <DrawerText sections={words.drawer} />;
}
