import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

/** Mechanics and maths for the curious: word vectors, the walk and cosine nearness. */
export function PlacesDrawer() {
  return <DrawerText sections={words.drawer} />;
}
