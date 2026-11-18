import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: fine-tuning and forgetting. */
export function TuneDrawer() {
  return <DrawerText sections={words.drawer} />;
}
