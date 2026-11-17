import { DrawerText } from "@/features/classic/DrawerText";
import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how a question is picked, and the mix measure. */
export function QuestionsDrawer() {
  return (
    <DrawerText
      sections={[
        { title: drawer.mechanics, paragraphs: [drawer.pick, drawer.repeat, drawer.cram] },
        { title: drawer.maths, paragraphs: [drawer.formula] },
      ]}
    />
  );
}
