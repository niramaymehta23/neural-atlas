import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

const { drawer } = words;

/** How the map is drawn, what not to read into it, and the maths. */
export function MapDrawer() {
  return (
    <DrawerText
      sections={[
        {
          title: drawer.mechanics,
          paragraphs: [drawer.neighbours, drawer.pull, drawer.early, drawer.careful],
        },
        { title: drawer.maths, paragraphs: [drawer.formula] },
      ]}
    />
  );
}
