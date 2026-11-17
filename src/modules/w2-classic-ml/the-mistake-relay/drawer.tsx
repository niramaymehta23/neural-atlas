import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: the starting guess, each runner's nudge, chasing noise. */
export function RelayDrawer() {
  return (
    <DrawerText
      sections={[
        {
          title: drawer.mechanics,
          paragraphs: [drawer.start, drawer.runner, drawer.push, drawer.noise],
        },
        { title: drawer.maths, paragraphs: [drawer.formula] },
      ]}
    />
  );
}
