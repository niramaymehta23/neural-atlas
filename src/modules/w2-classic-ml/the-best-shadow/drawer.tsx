import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

const { drawer } = words;

/** What makes a shadow good, and the maths. */
export function ShadowDrawer() {
  return (
    <DrawerText
      sections={[
        { title: drawer.mechanics, paragraphs: [drawer.spread, drawer.best, drawer.use] },
        { title: drawer.maths, paragraphs: [drawer.formula] },
      ]}
    />
  );
}
