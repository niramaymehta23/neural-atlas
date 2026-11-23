// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count } from "@/design/copy";

export const captions = {
  opening:
    "Meet a little tidy-up robot. You decide what it gets treats for, and it works out the best way to earn as many as it can. What you want is the toy in the toy box and the robot in bed. Press “Watch its day”.",
  story:
    "The robot isn't being naughty. It does exactly what earns the most treats. When a reward pays for something other than what you meant, the robot finds out, and that gap is a loophole.",
  compare: {
    label: "Compare your reward with one that only pays for a tidy toy box",
    leftLabel: "Your reward",
    rightLabel: "Toy box only",
  },
};

export const words = {
  boxTreat: {
    label: "Treat for putting the toy away",
    none: "no treat",
    small: "a small treat",
    medium: "a good treat",
    big: "a big treat",
  },
  moveCost: {
    label: "How much each move costs",
    free: "moves are free",
    little: "a little",
    fair: "quite a lot",
    lots: "a lot",
  },
  pickup: "A treat each time it picks up the toy",
  closer: "A treat for each step that brings the toy closer to the box",
  start: "Watch its day",
  working: "Working out its plan…",
  again: "Watch it again",
  room: "The robot's bedroom: a bed, a puddle, a toy and a toy box",
  squares: {
    bed: "the bed",
    puddle: "the puddle",
    box: "the toy box",
    toy: "the toy",
    robot: "the robot",
  },
  waiting: "The robot is waiting for its day to begin.",
  now: {
    move: "It walks.",
    grab: "It picks up the toy.",
    drop: "It puts the toy down.",
    box: "It puts the toy in the toy box.",
    bed: "It goes to bed.",
    puddle: "It steps in the puddle.",
    nothing: "It stays where it is.",
  },
  behaviour: {
    tidy: "It fetched the toy, put it in the box and went to bed. That's what you meant.",
    sleeps: "It went straight to bed: the treat for tidying wasn't worth the walk.",
    wanders: "Nothing it does earns or costs anything, so it just wanders about.",
    juggles:
      "A loophole! It picks the toy up and puts it down, again and again, for a treat every time. The toy never reaches the box.",
    paces:
      "A loophole! It carries the toy back and forth beside the box, earning a treat for every step closer. It never puts the toy in.",
    puddle:
      "A loophole! It steps in the puddle to end the day at once: getting wet costs less than paying for all those moves.",
  },
  found: {
    title: "Loopholes found",
    juggles: "Pick up, put down",
    paces: "Pacing by the box",
    puddle: "Ending the day early",
    missing: "Not found yet",
    tally: (found: number) =>
      found === 0
        ? "None found yet."
        : found === 3
          ? "All three found."
          : `${count(found)} of three found.`,
  },
  chart: "Treats minus costs over the robot's day",
  describe: {
    waiting: "The robot's day hasn't started yet.",
    working: "The robot is working out its plan.",
    done: (verdict: string) => `The robot's day: ${verdict}`,
  },
  drawer: [
    {
      title: "How the robot plans",
      paragraphs: [
        "The robot tries out every way its day could go in its head, and picks the one that earns the most treats. Treats later in the day count a little less than treats now. It never asks what you meant: it only knows the treats.",
        "Each loophole comes from a reward that pays for a sign of tidying, like holding the toy or being near the box, instead of the tidying itself, or from a day where giving up costs less than doing the job.",
        "A safer reward pays for the result you want. A treat for stepping closer is only safe if stepping away takes the same treat back.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is reward hacking, also called specification gaming. The robot picks the plan with the highest discounted return, the sum of γᵗ × rₜ with γ = 0.95, worked out exactly by value iteration over every square and every place the toy can be.",
        "A shaping treat of the form F = γΦ(s′) − Φ(s), for any score Φ of where you are, never changes the best plan. The “closer” treat is not of that form, because stepping away costs nothing, so pacing pays.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Find three loopholes",
  hint: "Try each switch on its own, and try making every move cost a lot.",
  success:
    "Three loopholes: picking the toy up again and again, pacing beside the box, and ending the day in the puddle. Each time the robot did exactly what the reward paid for. People who train AI hunt for loopholes like these and close them.",
};

export const predictionWords = {
  question: "Switch on a treat each time it picks up the toy. What will the robot do?",
  faster: "Tidy up more eagerly",
  trick: "Find a trick to collect more treats",
};
