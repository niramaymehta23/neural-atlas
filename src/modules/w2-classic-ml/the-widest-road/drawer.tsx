import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: the widest road, strictness and lifting. */
export function RoadDrawer() {
  return (
    <DrawerText
      sections={[
        { title: drawer.mechanics, paragraphs: [drawer.widest, drawer.strict, drawer.lift] },
        { title: drawer.maths, paragraphs: [drawer.formula] },
      ]}
    />
  );
}
