/** Every word of the journeys: their names, and what each stop says. */
export const journeyCaptions = {
  begin: "Start this journey",
  stops: (count: string) => `${count} stops`,
  stop: (at: string, of: string) => `Stop ${at} of ${of}`,
  stopNamed: (at: number, title: string) => `${at}: ${title}`,
  next: "Next stop",
  back: "Back a stop",
  arrived: "You’ve arrived",
  again: "Start again from the beginning",
  others: "All the journeys",
  auto: "Move on by itself",
  autoNote: "It waits a while at each stop, and stops waiting as soon as you touch something.",
  map: "All the stops",
  journeys: {
    "how-chatgpt-works": {
      title: "How ChatGPT works",
      line: "You type a question. An answer comes back, word by word. Here is everything that happens in between.",
      end: "That is the whole trip: pieces, places, looking around, guessing, reading, and being taught what people like. A chatbot is all of these at once, a great many times over.",
      stops: {
        "chopping-text-into-pieces":
          "You type a question. Before anything else, it is chopped into pieces, because the machine reads chunks and not words. Type something and watch it being cut.",
        "words-as-places":
          "Each piece becomes a place on a map of meaning, close to pieces that are used in the same way. That is all the machine knows of a word: where it lives.",
        "knowing-the-order":
          "A pile of places has no order, and order changes everything. So each piece also carries a mark saying where in the line it stood.",
        "who-is-looking-at-whom":
          "Now the pieces look at each other. Each one checks which of the others matter for understanding it. Tap a word to see where it looks.",
        "many-readers-at-once":
          "One look is not enough. Several readers look at the same line at once, each one after something different.",
        "the-thinking-block":
          "Look around, then think: that pair makes one block. A chatbot stacks dozens of these blocks on top of each other.",
        "guess-the-next-word":
          "Out of the top comes a guess: how likely every possible next piece is. Pick one, add it to the line, and start over. The whole answer is written this way.",
        "safe-vs-adventurous":
          "It need not take the likeliest piece every time. One dial makes the answers safe or adventurous.",
        "reading-the-internet":
          "How did it get good at guessing? By reading a mountain of text and checking each guess against what really came next.",
        "bigger-and-bigger":
          "More cells, more reading and more computing made the guesses better and better. This is the part that took warehouses full of computers.",
        specialising:
          "A good guesser is not yet a good helper. So it studies examples of helpful answers until it answers in that style.",
        "learning-from-thumbs-up":
          "Then people compare its answers and say which they like better. It learns to write more of the kind that people choose.",
        "back-to-chatbots":
          "That last step is learning by treats, the same kind that teaches a puppy. Push it too far and the machine starts to please rather than help.",
        "short-term-memory":
          "Everything it knows about your chat has to fit in front of it at once. When the line grows too long, the beginning falls off.",
        "confident-but-wrong":
          "And a warning to end on. It writes what sounds right, which is not always what is right. Now you know why.",
      },
    },
    "learning-by-trying": {
      title: "How a machine learns to play",
      line: "Nobody tells it the rules of winning. It tries, gets treats or trouble, and gets better.",
      end: "From one puppy and its treats to a player that beats itself: the same idea all the way. Try, see what happened, do more of what worked.",
      stops: {
        "treats-and-tricks":
          "Start with a puppy. It tries something, and sometimes there is a treat. Soon it does the thing that brings treats.",
        "new-or-favourite":
          "Should it try something new, or go back to what worked? Too much of either one is a mistake.",
        "the-game-board":
          "Now turn the world into a board: places to be, moves to make, and something to win.",
        "now-vs-later":
          "A treat now, or a bigger one later? How much the future counts changes everything it does.",
        "good-places-to-be":
          "Some squares are better to stand on than others, because of where you can go from there.",
        "scoring-every-move":
          "Keep a score for every move from every square and fix the scores as you go. That is enough to learn the whole board.",
        "a-brain-for-the-game":
          "When there are too many squares to list, a small network takes the place of the score table.",
        "player-and-coach":
          "Two learners help each other: one plays, and the other judges how it is going.",
        "thinking-ahead":
          "The best players also imagine. They play out many moves in their head before making one.",
        "practising-against-yourself":
          "And with nobody good enough to play against, it plays a copy of itself, over and over.",
        loopholes:
          "Last, a warning: it does exactly what you reward, which may not be what you meant.",
      },
    },
    "how-machines-make-pictures": {
      title: "How a machine makes a picture",
      line: "From seeing edges to painting something nobody has ever drawn.",
      end: "Seeing, squeezing, imagining, and cleaning up fog until a picture appears. Put words on the same map, and you can ask for the picture you want.",
      stops: {
        "the-pattern-torch":
          "Before a machine can make pictures it has to see them. It starts by shining a small torch over the picture, looking for one pattern.",
        "squeeze-and-rebuild":
          "Squeeze a picture into a few numbers, then rebuild it. Whatever survives the squeeze is what the machine thinks matters.",
        "smooth-imagination":
          "Those few numbers make a map of pictures. Walk around the map and you pass through pictures nobody drew.",
        "forger-vs-detective":
          "One way to make the pictures convincing: a forger who fakes them, and a detective who tries to catch the fakes.",
        "painting-from-fog":
          "The way most picture makers work today: begin with nothing but fog, and clean it up a little at a time.",
        "pictures-and-words-together":
          "Last, put words and pictures on one map of meaning. Now you can describe a picture, and the machine knows which way to clean the fog.",
      },
    },
  },
};
