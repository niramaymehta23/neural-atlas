import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: distances, the vote and the closeness weight. */
export function NeighboursDrawer() {
  return (
    <DrawerText
      sections={[
        {
          title: drawer.mechanics,
          paragraphs: [drawer.distance, drawer.vote, drawer.closer, drawer.map],
        },
        { title: drawer.maths, paragraphs: [drawer.formula] },
      ]}
    />
  );
}
