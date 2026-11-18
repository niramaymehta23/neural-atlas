import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: bits, glue steps and byte-pair encoding. */
export function PiecesDrawer() {
  return <DrawerText sections={words.drawer} />;
}
