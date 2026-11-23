import { count, outOf } from "@/design/copy";
import type { GameGarden, PaceName, TeamName } from "./model";

/** A label as it reads inside a sentence. */
const sentenceMiddle = (label: string) => label.charAt(0).toLowerCase() + label.slice(1);

/** Every word of the two-player games. */
export const twoPlayerCaptions = {
  game: { label: "The game", race: "Race to train", mend: "Break and repair" },
  players: ["Player one", "Player two"] as const,
  garden: {
    label: "The garden",
    names: {
      circles: "A ring around a middle",
      moons: "Two crescents",
      xor: "Four corners",
      spiral: "Two arms winding round",
    } satisfies Record<GameGarden, string>,
  },
  rules: {
    race: "Each player picks a team in secret. Then both teams practise on the same dots, with exactly the same amount of computing to spend. The first to get nearly every new dot right wins.",
    mend: "One player cuts three threads of a team that has learned this garden. The other picks two cells and sends only those back to practise. Get the team going again and the repairer wins; if not, the breaker does.",
  },
  ready: "I’m ready",
  pass: (player: string) => `Now pass the screen to ${player}.`,
  passNote: (player: string) => `Only ${player} should look from here.`,
  hide: "Hide my choice",
  race: {
    heading: (player: string) => `${player}, pick your team`,
    size: "How many cells",
    sizes: {
      small: "A few cells",
      middle: "One row of cells",
      big: "Two big rows",
    } satisfies Record<TeamName, string>,
    sizeNotes: {
      small: "Quick to practise, but it can only draw simple shapes.",
      middle: "In between.",
      big: "It can draw almost anything, but every round costs far more.",
    } satisfies Record<TeamName, string>,
    pace: "How big a step it takes after a mistake",
    paces: {
      careful: "Careful steps",
      steady: "Steady steps",
      bold: "Bold steps",
    } satisfies Record<PaceName, string>,
    paceNotes: {
      careful: "Sure of foot, and slow.",
      steady: "In between.",
      bold: "Fast, and likely to trip over itself.",
    } satisfies Record<PaceName, string>,
    ready: "Ready to race",
    readyNote: "Both teams are waiting. Press start together.",
    start: "Start the race",
    pause: "Pause the race",
    carryOn: "Carry on racing",
    garden: (player: string) => `${player}’s guess for every spot`,
    right: (right: number) => `${outOf(right, { total: 100, noun: "new dots" })} right.`,
    rounds: (rounds: number) => `Practised ${count(rounds)} rounds.`,
    team: (size: string, pace: string) => `${size}, ${sentenceMiddle(pace)}`,
    bar: (player: string) => `${player}: how many new dots it gets right`,
    won: (player: string) => `${player} wins!`,
    tie: "A tie!",
    goal: "The notch is where a team wins.",
    ended: "Nobody reached the notch in time, so the better team wins.",
    tiedEnd: "Neither pulled ahead.",
    same: "Same team, same steps, same computing: that had to be a tie.",
  },
  mend: {
    break: {
      heading: (player: string) => `${player}, cut three threads`,
      note: (left: number) =>
        left > 0
          ? `Cut ${count(left)} more. Thick threads matter most, but not always.`
          : "All three cut. Change your mind, or hide your choice and pass the screen on.",
      cell: (cell: number) => `Cell ${cell}`,
      threads: ["in, across", "in, up", "out"] as const,
      thread: (cell: number, which: string, cut: boolean) =>
        `Cell ${cell}, the thread ${which}${cut ? ", cut" : ""}`,
    },
    repair: {
      heading: (player: string) => `${player}, pick two cells to practise`,
      note: (left: number) =>
        left > 0
          ? `Pick ${count(left)} more. Only these cells may change, and cut threads stay cut.`
          : "Two picked. Send them to practise.",
      cell: (cell: number) => `Cell ${cell}`,
      start: "Send them to practise",
      pause: "Pause",
      carryOn: "Carry on",
      practising: "Practising…",
    },
    network: "The team: two ways in, eight cells, one way out. Crosses mark cut threads.",
    garden: "The team’s guess for every spot",
    whole: (right: number) =>
      `Whole, it gets ${outOf(right, { total: 100, noun: "new dots" })} right.`,
    broken: (right: number) =>
      `With the threads cut, ${outOf(right, { total: 100, noun: "right" })}.`,
    now: (right: number) => `Now ${outOf(right, { total: 100, noun: "right" })}.`,
    goal: (goal: number) =>
      `Repaired means at least ${outOf(goal, { total: 100, noun: "right" })}.`,
    bar: "How many new dots the team gets right",
    repaired: (player: string) => `Repaired! ${player} wins.`,
    notRepaired: (player: string) => `Still broken. ${player} wins.`,
  },
  score: {
    label: "Rounds won",
    line: (first: string, second: string) => `Player one: ${first}. Player two: ${second}.`,
  },
  again: "Play another round",
  swap: "Swap places and play again",
  restart: "Start this round over",
  zero: "Set the score to nothing",
  term: {
    lead: "The real word is",
    race: "compute budget",
    mend: "pruning and fine-tuning",
  },
};
