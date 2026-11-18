import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: one shared map for pictures and words. */
export function PicturesDrawer() {
  return <DrawerText sections={words.drawer} />;
}
