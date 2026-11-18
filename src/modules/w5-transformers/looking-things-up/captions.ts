// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.

const quote = (text: string) => `“${text}”`;

export const captions = {
  opening:
    "A chatbot's memory of what it read can be fuzzy or out of date. So some chatbots look things up first: a librarian finds the pages that match your question, and the chatbot answers from them.",
  story:
    "The librarian matches books by meaning, not exact words. The chatbot then trusts whatever it is handed. Hand it the right book and the answer is solid; hand it the wrong one and it answers from that anyway.",
  compare: {
    label: "Compare with the librarian choosing the book",
    leftLabel: "Your way",
    rightLabel: "Librarian chooses",
  },
};

/** The little library: each book's title and pages. */
export const LIBRARY = [
  {
    title: "Our Moon",
    pages: [
      "The Moon is about 384 thousand kilometres away from Earth.",
      "The Moon has no air, so there is no wind or weather there.",
      "People first walked on the Moon in 1969.",
    ],
  },
  {
    title: "Football for Everyone",
    pages: [
      "A football team has eleven players on the field.",
      "A team scores goals by kicking the ball into the net.",
      "Only the goalkeeper may hold the ball with their hands.",
    ],
  },
  {
    title: "Making Music",
    pages: [
      "A piano makes music when small hammers hit its strings.",
      "Songs are made of a tune, a beat and often words.",
      "Many children learn music by singing together.",
    ],
  },
  {
    title: "Wild Weather",
    pages: [
      "Snow falls when the air high up is very cold.",
      "Rain comes from water that rises from the sea and falls again.",
      "Strong winds can blow down trees in a storm.",
    ],
  },
  {
    title: "Great Rivers",
    pages: [
      "Rivers carry fresh water from the hills down to the sea.",
      "The Nile and the Amazon are the two longest rivers in the world.",
      "Many big cities were built beside a river.",
    ],
  },
  {
    title: "All About Trains",
    pages: [
      "An engine pulls the train along the railway.",
      "The first railway for passengers opened in 1825.",
      "Fast trains can travel more than three hundred kilometres an hour.",
    ],
  },
] as const;

/** Ready-made questions, each with the book that really answers it. */
export const QUESTIONS = [
  { ask: "How far away is the Moon from Earth?", book: 0 },
  { ask: "How many players are in a football team?", book: 1 },
  { ask: "How does a piano make music?", book: 2 },
  { ask: "Why does snow fall?", book: 3 },
  { ask: "Where do rivers carry their water?", book: 4 },
  { ask: "What pulls a train along?", book: 5 },
] as const;

export const words = {
  question: "Your question",
  questions: "Or ask",
  librarian: "The librarian's best matches",
  match: (likeness: number) => {
    if (likeness >= 0.85) return "a very good match";
    if (likeness >= 0.7) return "a good match";
    if (likeness >= 0.5) return "a weak match";
    return "hardly a match";
  },
  hand: (title: string) => `Hand it ${quote(title)} instead`,
  handLabel: "Hand it a book yourself",
  letLibrarian: "Let the librarian choose",
  handed: (title: string) => `The chatbot was handed ${quote(title)}.`,
  answer: "Its answer",
  answerLabel: (text: string) => `The chatbot answers: ${text}`,
  fromMemory:
    "Without looking anything up, it answers from fuzzy memory: “I think it might be about that, but I'm not sure.”",
  wrongBook:
    "That book doesn't answer this question, but the chatbot answered from it anyway, sounding just as sure.",
  rightBook: "This is the book that really answers the question.",
  unknown: "The librarian couldn't understand any of these words. Try everyday words.",
  lookUp: "Look things up first",
  model: {
    loading: "Opening the library…",
    failed: "The library's word map could not be fetched. Check your connection and try again.",
    retry: "Try again",
  },
  describe: {
    waiting: "The library is opening.",
    memory: "It answers from memory, without looking anything up.",
    done: (title: string, answer: string) => `It was handed ${quote(title)} and answers: ${answer}`,
  },
  drawer: [
    {
      title: "How the librarian finds books",
      paragraphs: [
        "Every word has a spot on a word map (as in “Words as places”). The librarian averages the spots of your question's words, does the same for each book, and hands over the book whose average spot is closest.",
        "The chatbot then answers using the sentence from that book that is closest in meaning to your question. Real chatbots write a fresh answer from the pages, but they lean on them the same way.",
        "The chatbot never checks whether the book really answers the question. That's the librarian's job, and when the librarian slips, so does the answer.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is retrieval-augmented generation (RAG). Questions and passages are embedded (here, the mean of GloVe word vectors), ranked by cosine similarity, and the top passage is placed in the model's context before it answers.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Hand it the wrong book",
  hint: "Pick one of the ready-made questions, then hand the chatbot a book about something else.",
  success:
    "The chatbot trusted the book it was handed and answered from it, wrong but confident. Looking things up only helps when the right pages are found.",
};

export const predictionWords = {
  question: "If the chatbot is handed the wrong book, what will it do?",
  refuse: "Notice, and say it can't answer",
  anyway: "Answer from the wrong book anyway",
};
