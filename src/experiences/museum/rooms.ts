import type { DatasetName } from "@/data/datasets";
import type { GardenModel } from "@/engine/lab/garden-run";
import { museumCaptions } from "./captions";

const words = museumCaptions.rooms_;
export type RoomId = keyof typeof words;

/** What there is to play with: a lesson, by its catalog id, or a learner in a garden of dots. */
export type Exhibit =
  { kind: "lesson"; lesson: string } | { kind: "pair"; garden: DatasetName; model: GardenModel };

const play = (lesson: string): Exhibit => ({ kind: "lesson", lesson });

export type Room = {
  id: RoomId;
  /** When it happened, as shown: a year. */
  year: number;
  exhibit: Exhibit;
  title: string;
  story: string;
  today: string;
  term: string;
};

/** Which year each room belongs to, and what there is to try. */
const PLACES: readonly { id: RoomId; year: number; exhibit: Exhibit }[] = [
  { id: "perceptron", year: 1958, exhibit: play("splitting-into-groups") },
  { id: "samuel", year: 1959, exhibit: play("good-places-to-be") },
  { id: "book", year: 1969, exhibit: { kind: "pair", garden: "xor", model: "line" } },
  { id: "backprop", year: 1986, exhibit: play("passing-back-the-blame") },
  { id: "digits", year: 1989, exhibit: play("the-pattern-torch") },
  { id: "backgammon", year: 1992, exhibit: play("practising-against-yourself") },
  { id: "memory", year: 1997, exhibit: play("choosing-what-to-remember") },
  { id: "alexnet", year: 2012, exhibit: play("how-machines-see") },
  { id: "words", year: 2013, exhibit: play("words-as-places") },
  { id: "forger", year: 2014, exhibit: play("forger-vs-detective") },
  { id: "atari", year: 2015, exhibit: play("a-brain-for-the-game") },
  { id: "go", year: 2016, exhibit: play("thinking-ahead") },
  { id: "attention", year: 2017, exhibit: play("who-is-looking-at-whom") },
  { id: "scale", year: 2020, exhibit: play("bigger-and-bigger") },
  { id: "fog", year: 2020, exhibit: play("painting-from-fog") },
  { id: "chat", year: 2022, exhibit: play("learning-from-thumbs-up") },
  { id: "actions", year: 2022, exhibit: play("ai-that-takes-actions") },
];

export const rooms: readonly Room[] = PLACES.map((place) => ({ ...place, ...words[place.id] }));

/** The room an address asks for (`#room=go`), if there is one. */
export function roomFromHash(hash: string): RoomId | null {
  const asked = new URLSearchParams(hash.replace(/^#/, "")).get("room");
  return rooms.find(({ id }) => id === asked)?.id ?? null;
}
