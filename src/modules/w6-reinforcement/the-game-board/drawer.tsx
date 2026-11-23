import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: the board worked out exactly. */
export function GameBoardDrawer() {
  return <DrawerText sections={words.drawer} />;
}
