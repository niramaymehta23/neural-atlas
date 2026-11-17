import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

const { drawer } = words;

/** How the magnets move and stop, and the maths. */
export function GroupsDrawer() {
  return (
    <DrawerText
      sections={[
        {
          title: drawer.mechanics,
          paragraphs: [drawer.grab, drawer.middle, drawer.stop, drawer.shape],
        },
        { title: drawer.maths, paragraphs: [drawer.formula] },
      ]}
    />
  );
}
