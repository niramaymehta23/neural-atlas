import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: temperature, top-k and surprise. */
export function SamplingDrawer() {
  return <DrawerText sections={words.drawer} />;
}
