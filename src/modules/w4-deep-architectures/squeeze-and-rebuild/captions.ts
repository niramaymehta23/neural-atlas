// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
import type { Closeness } from "./model";

export const captions = {
  opening:
    "A machine squeezes a picture of a face into a short list of numbers, then tries to draw the face again from that list alone. Choose how many numbers it may keep.",
  story:
    "The fewer numbers it keeps, the less it can say about the face, so the rebuild turns into a blurry, everyday face. The first numbers hold the big things, like the face’s shape and shade; later ones add the small details.",
  compare: {
    label: "Compare your squeeze with keeping all sixteen numbers",
    leftLabel: "Your squeeze",
    rightLabel: "All sixteen numbers",
  },
};

const CLOSENESS: Record<Closeness, string> = {
  almost: "The rebuild is almost exactly the face.",
  rough: "The rebuild is close, but softer, with small details lost.",
  blurry: "The rebuild is blurry: only the rough shape of a face is left.",
};

export const words = {
  keep: {
    label: "How many numbers it keeps",
    one: "just one number",
    many: (count: string) => `${count} numbers`,
  },
  smudge: {
    label: "How speckled the picture is",
    none: "no speckles",
    few: "a few speckles",
    lots: "lots of speckles",
    covered: "covered in speckles",
  },
  faces: {
    label: "Which face to squeeze",
    face: (number: number) => `Face ${number}`,
  },
  picture: {
    input: "The picture that goes in",
    rebuilt: "The picture drawn again from the numbers",
    inputLabel: "The face that goes into the squeeze",
    rebuiltLabel: "The face drawn again from the kept numbers",
  },
  list: {
    label: (kept: string, dropped: string) =>
      `The short list: ${kept} kept, ${dropped} thrown away`,
    allKept: "The short list: all sixteen numbers kept",
    heading: "The short list of numbers",
    key: { kept: "Kept", dropped: "Thrown away" },
  },
  closeness: CLOSENESS,
  speckles: "The speckles did not come back: the short list only has room for faces.",
  model: {
    loading: "Fetching the squeezer…",
    failed: "The squeezer couldn’t be fetched. Check your connection, then try again.",
    retry: "Try again",
  },
  describe: {
    loading: "The squeezer is on its way.",
    done: (kept: string, how: string) => `Squeezed down to ${kept}. ${how}`,
  },
  drawer: {
    mechanics: "What the squeezer does",
    halves:
      "It is two small networks back to back. The first turns the 1,024 grey dots of the picture into 16 numbers. The second turns those numbers back into 1,024 dots.",
    order:
      "While it practised, it was often allowed only the first few numbers, so it learned to put the most useful facts first. That is why throwing away the last numbers costs little, and throwing away the first costs a lot. The last few hardly matter at all.",
    speckles:
      "It only ever practised on clean faces, so the second half only knows how to draw faces. Speckles have nowhere to go in the short list, and they disappear.",
    maths: "The maths",
    formula:
      "numbers = encoder(picture), 16 of them. rebuild = decoder(first k numbers, the rest set to 0). It practised by making rebuild ≈ picture, with k picked at random each time (nested dropout).",
  },
};

export const missionWords = {
  goal: "Squeeze the face down to just one number",
  hint: "Turn “How many numbers it keeps” all the way down.",
  success:
    "One number can only say one big thing, like how dark the face is. Everything else — eyes, mouth, hair — has to be guessed, so the rebuild becomes a blurry, everyday face.",
};

export const predictionWords = {
  question:
    "Cover the picture in speckles before it is squeezed. Will the rebuilt picture be speckled too?",
  speckled: "Yes, the speckles come back",
  clean: "No, it comes back clean",
};
