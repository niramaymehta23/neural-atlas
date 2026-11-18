// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
import type { PhotoGroup } from "@/features/inside/use-photo";
import type { Start } from "./model";

export const captions = {
  opening:
    "Teach a tiny new AI to tell cats, dogs and flowers apart from just a few photos. It can start from scratch, or from what a big picture-reading AI already knows.",
  story:
    "The big AI spent a long time learning from over a million photos. Its deep layers turn any photo into a list of numbers about edges, shapes and parts. The tiny AI only has to learn which of those numbers point to a cat, a dog or a flower, so a handful of photos is enough. From scratch, it has to find all of that by itself.",
  compare: {
    label: "Compare starting from the big AI with starting from scratch",
    leftLabel: "Your start",
    rightLabel: "Other start",
  },
};

const GROUP_NAMES: Record<PhotoGroup, string> = { cats: "Cats", dogs: "Dogs", flowers: "Flowers" };
const ONE_NAMES: Record<PhotoGroup, string> = { cats: "cat", dogs: "dog", flowers: "flower" };

const START_NAMES: Record<Start, string> = {
  giant: "The big AI's know-how",
  blank: "Scratch: bare grey dots",
};

const START_SHORT: Record<Start, string> = {
  giant: "the big AI's know-how",
  blank: "scratch",
};

const HOW_MANY = ["just one", "two", "three", "four", "five"];

export const words = {
  start: { label: "Start from", names: START_NAMES, short: START_SHORT },
  teach: { label: "How many photos of each to teach with", names: HOW_MANY },
  groups: GROUP_NAMES,
  one: ONE_NAMES,
  teaching: "Teaching photos",
  kept: "New photos it never saw",
  photoLabel: (group: string, index: number) => `${group} photo ${index}`,
  right: "right",
  wrong: (said: string) => `wrong: said ${said}`,
  waiting: "…",
  score: (right: string, total: string) => `It named ${right} of the ${total} new photos right.`,
  loading: "Getting the photos ready…",
  failed: "The photos or the big AI would not load.",
  retry: "Try again",
  camera: {
    use: "Teach it with my camera",
    stop: "Stop the camera",
    ask: {
      title: "Use your camera?",
      body: "You will snap a few pictures of your own things to teach the tiny AI. The pictures stay on this device. They are never sent anywhere or saved, and they are gone when the camera stops.",
      yes: "Yes, use my camera",
      no: "No thanks",
    },
    states: {
      off: "",
      starting: "Starting the camera…",
      on: "The camera is on. Its pictures stay on this device.",
      denied: "The camera is blocked, so teach with the photos instead.",
      missing: "No camera was found, so teach with the photos instead.",
      failed: "The camera would not start, so teach with the photos instead.",
    },
    video: "Your camera picture",
    snap: (group: number) => `Snap for group ${group}`,
    snaps: (group: number) => `Group ${group} snaps`,
    needs:
      "Snap at least one picture for each group, then hold one of your things up to the camera.",
    thinks: (group: number) => `It thinks this is group ${group}.`,
    reading: "The big AI is looking…",
  },
  describe: (start: string, teach: string, score: string) =>
    `Starting from ${start}, taught with ${teach} of each. ${score}`,
  describeWaiting: "Still teaching.",
  drawer: {
    mechanics: "What the tiny AI learns",
    numbers:
      "Every photo is turned into a list of numbers. From the big AI, they are what its deepest layer found: one number for each of its last torches. From scratch, they are just the photo shrunk to grey dots.",
    tiny: "The tiny AI gives each group a score: every number times a weight, added up. Teaching nudges the weights, again and again, so the right group scores highest on the teaching photos.",
    test: "The new photos were never used for teaching, so they show whether it learned what a cat looks like, or just remembered its few photos.",
    giant:
      "The big AI's numbers already say things like “furry”, “pointy ears” or “petals”, so a few weights are enough. Grey dots only say where the photo is light or dark, which changes with every photo.",
    maths: "The maths",
    formula: "score(group) = Σ weight(group, i) × number(i) + bias(group); the biggest score wins.",
    learning:
      "Teaching: weights move against how wrong the shares were (softmax and cross-entropy), a few hundred times.",
  },
};

export const missionWords = {
  goal: "Teach it with just one photo of each, and still get most new photos right",
  hint: "Set the photos to just one of each. Which start can learn that fast?",
  success:
    "One photo each was enough, because the big AI already knew what to look for. Reusing what one AI learned for a new task is called transfer learning.",
};

export const predictionWords = {
  question:
    "With just one photo of each to learn from, which start will name more of the new photos right?",
  giant: "Starting from the big AI",
  blank: "Starting from scratch",
  same: "About the same",
};
