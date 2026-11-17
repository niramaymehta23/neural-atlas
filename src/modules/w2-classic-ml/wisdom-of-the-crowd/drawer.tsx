import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: resampling, one-way questions, and the vote. */
export function CrowdDrawer() {
  return (
    <DrawerText
      sections={[
        {
          title: drawer.mechanics,
          paragraphs: [drawer.resample, drawer.questions, drawer.vote, drawer.same],
        },
        { title: drawer.maths, paragraphs: [drawer.formula] },
      ]}
    />
  );
}
