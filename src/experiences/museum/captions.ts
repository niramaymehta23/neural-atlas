/** Every word of the museum. Dates and facts are checked against sources (see the stage 11 report). */
export const museumCaptions = {
  years: "Jump to a year",
  rooms: "The rooms, oldest first",
  play: "Try it here",
  playNamed: (title: string) => `Try it here: ${title}`,
  away: "Put it away",
  awayNamed: (title: string) => `Put it away: ${title}`,
  lead: "In the history books:",
  byHand: "A small working copy of the idea, for you to play with.",
  end: "And that brings us to today. The next room has not been built yet.",
  rooms_: {
    perceptron: {
      title: "A machine that learned left from right",
      story:
        "In July 1958 the psychologist Frank Rosenblatt showed reporters a program on a computer the size of a room. It was told nothing except when it was wrong. After about fifty tries it could tell which side each card was marked on. Inside was a single cell, drawing a single fence.",
      today: "One cell, one fence. Give it examples and it moves its fence each time it is wrong.",
      term: "the perceptron",
    },
    samuel: {
      title: "The program that learned to beat its maker",
      story:
        "At IBM, Arthur Samuel wrote a program that played draughts. It kept a score for how good a board looked, tested the score against how the game went, and even played against a copy of itself. His 1959 report helped give the whole subject its name.",
      today: "Score how good each place is, then fix the scores as you go.",
      term: "machine learning",
    },
    book: {
      title: "The shape one fence cannot split",
      story:
        "In 1969 Marvin Minsky and Seymour Papert published a book showing what a single row of cells like Rosenblatt’s could never do, however long it practised. One of the simplest is this: two kinds of dots in opposite corners. Interest in such machines was already fading, and it stayed low for years.",
      today: "Try it: one straight fence, four corners. Nothing works.",
      term: "Perceptrons, the book",
    },
    backprop: {
      title: "Passing the blame backwards",
      story:
        "Stack the cells in rows and they can split almost any shape, if only each cell knew its share of every mistake. In 1986 David Rumelhart, Geoffrey Hinton and Ronald Williams showed how to pass the blame backwards, row by row. Others had found the idea before them; this is when it caught on.",
      today: "Watch each mistake travel back through the rows, and each thread shift a little.",
      term: "backpropagation",
    },
    digits: {
      title: "The machine that read the post",
      story:
        "At Bell Labs in 1989, Yann LeCun and his colleagues taught a network to read the handwritten numbers on American envelopes. It slid small pattern-finders across each picture. By the end of the next decade, machines built on the idea were reading handwritten cheques for banks.",
      today: "Shine the small torch over a picture and see which patterns light up.",
      term: "convolutional networks, LeNet",
    },
    backgammon: {
      title: "It taught itself by playing itself",
      story:
        "In 1992 Gerald Tesauro at IBM showed off a network that had played backgammon against itself hundreds of thousands of times. Nobody showed it good moves. A later version came very close to the best people in the world, and even changed how some of them play.",
      today: "A player with nobody to learn from but its own copy.",
      term: "TD-Gammon",
    },
    memory: {
      title: "Learning what to hold on to",
      story:
        "Networks that read one word at a time kept losing the start of the sentence. In 1997 Sepp Hochreiter and Jürgen Schmidhuber gave them a memory with gates: one to let things in, one to let things out. Later, such networks ran in voice assistants and translators.",
      today: "Open and close the gates yourself, and see what it still remembers.",
      term: "long short-term memory",
    },
    alexnet: {
      title: "Suddenly, machines could see",
      story:
        "Every year, programs raced to name what was in a huge pile of photos. In 2012 a deep network by Alex Krizhevsky, Ilya Sutskever and Geoffrey Hinton won by a mile, trained on two graphics cards made for video games. Soon nearly everyone was building deep networks.",
      today: "Edges become shapes, and shapes become things.",
      term: "AlexNet",
    },
    words: {
      title: "Words on a map",
      story:
        "In 2013 Tomas Mikolov and his colleagues at Google found a fast way to give every word a place, by guessing it from its neighbours. Directions on maps like this can mean something: walk from man to woman, take the same steps from king, and you end up near queen.",
      today: "Walk the same steps from another word and see where you land.",
      term: "word2vec",
    },
    atari: {
      title: "Playing games from the picture alone",
      story:
        "A team at DeepMind gave a network the picture on the screen, the score, and the buttons, and nothing else. By 2015 one program design had learned dozens of old video games, many of them about as well as a person who tests games for a living.",
      today: "A small network learning a catching game from what it sees.",
      term: "deep Q-network",
    },
    forger: {
      title: "The forger and the detective",
      story:
        "In 2014 Ian Goodfellow and his colleagues set two networks against each other. One makes fakes, the other tries to spot them, and each gets better because of the other. For years this made the most lifelike pictures machines could draw.",
      today: "Let them practise, and watch the fakes fool the detective.",
      term: "generative adversarial networks",
    },
    go: {
      title: "The move nobody expected",
      story:
        "Go has far too many possible games to look through. In March 2016, AlphaGo beat the champion Lee Sedol by four games to one. It mixed instinct from a network with imagining moves ahead, and one of its moves was so odd that people thought it was a mistake.",
      today: "Imagine many games, then play the move that went best.",
      term: "AlphaGo",
    },
    attention: {
      title: "Look at everything at once",
      story:
        "In 2017 eight researchers at Google dropped the word-by-word memory. Instead, every word looks at every other word, all at the same time. It learned faster, and it worked better. Nearly every chatbot since is built this way.",
      today: "Tap a word and see which other words it looks at.",
      term: "the Transformer",
    },
    scale: {
      title: "What happens if you make it huge?",
      story:
        "In 2020 OpenAI built a word guesser with 175 billion adjustable threads, and had it read a huge slice of the internet. It could do jobs nobody had trained it for, just from being shown a few examples. The same year, another paper showed how steadily the guesses improve with size.",
      today: "Grow the brain, the reading and the computing, and watch the mistakes shrink.",
      term: "GPT-3 and scaling laws",
    },
    fog: {
      title: "Painting out of fog",
      story:
        "Cover a picture with fog, a little at a time, and teach a network to undo one step. The idea was a few years old when, in 2020, Jonathan Ho, Ajay Jain and Pieter Abbeel used it to paint brand new pictures, starting from nothing but fog, that looked as good as the best. Most picture makers now work this way.",
      today: "Start with fog and clean it up into a picture.",
      term: "diffusion models",
    },
    chat: {
      title: "Everybody meets a chatbot",
      story:
        "On 30 November 2022, OpenAI put ChatGPT on the web for anyone to try. Under it was a word guesser, taught with people’s own choices about which answers were better. That teaching is what turned a guesser into something you could talk to.",
      today: "Pick the better answer, again and again, and watch it change.",
      term: "learning from human feedback",
    },
    actions: {
      title: "From talking to doing",
      story:
        "Late in 2022, researchers showed that a chatbot does better when it writes down what it is thinking, uses a tool, reads the result, and thinks again. That loop is what lets today’s helpers look things up, write programs and book a table.",
      today: "Think, use a tool, check, and go again.",
      term: "agents",
    },
  },
};
