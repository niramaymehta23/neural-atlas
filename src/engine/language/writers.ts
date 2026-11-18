/**
 * World 5's two tiny writers (public/models/tiny-writers-v1, trained by scripts/train-writers.py):
 * the word-level storyteller and the letter-level writer baby GPT starts from, with the facts and
 * book titles the storyteller read.
 */
import { createGpt, type Gpt, type GptShape } from "./tiny-gpt";

export const WRITERS_PATH = "/models/tiny-writers-v1/";

export type AnimalFacts = { eats: string; lives: string; colour: string | null; book: string };

export type WritersManifest = {
  storyteller: {
    file: string;
    shape: GptShape;
    words: string[];
    fixture: { words: string[]; scores: number[] };
  };
  writer: {
    file: string;
    shape: GptShape;
    letters: string;
    fixture: { text: string; scores: number[] };
    everyday: string;
  };
  animals: Record<string, AnimalFacts>;
  books: string[];
  names: string[];
  pets: string[];
};

export type Storyteller = {
  gpt: Gpt;
  words: readonly string[];
  index: ReadonlyMap<string, number>;
};

export type LetterWriter = {
  shape: GptShape;
  /** The pretrained weights; copy before practising on them. */
  base: Float32Array;
  letters: string;
  /** Text it read in practice, for measuring how much of it is kept. */
  everyday: string;
};

export type Writers = {
  storyteller: Storyteller;
  writer: LetterWriter;
  animals: Readonly<Record<string, AnimalFacts>>;
  books: readonly string[];
  names: readonly string[];
  pets: readonly string[];
};

function floats(bytes: ArrayBuffer, shape: GptShape, name: string): Float32Array {
  if (bytes.byteLength % 4 !== 0) throw new Error(`${name} is cut short.`);
  const params = new Float32Array(bytes);
  createGpt(shape, params);
  return params;
}

export function readWriters(
  manifest: WritersManifest,
  storyBytes: ArrayBuffer,
  writerBytes: ArrayBuffer,
): Writers {
  const { storyteller, writer } = manifest;
  return {
    storyteller: {
      gpt: createGpt(storyteller.shape, floats(storyBytes, storyteller.shape, storyteller.file)),
      words: storyteller.words,
      index: new Map(storyteller.words.map((word, at) => [word, at])),
    },
    writer: {
      shape: writer.shape,
      base: floats(writerBytes, writer.shape, writer.file),
      letters: writer.letters,
      everyday: writer.everyday,
    },
    animals: manifest.animals,
    books: manifest.books,
    names: manifest.names,
    pets: manifest.pets,
  };
}

/** The storyteller's words in `text`: lower case, with "." and "?" as words of their own. */
export function storyWords(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+|[.?]/g) ?? [];
}

/** The storyteller's ids for `text`, or null when it has a word the storyteller never read. */
export function storyIds(storyteller: Storyteller, text: string): number[] | null {
  const ids: number[] = [];
  for (const word of storyWords(text)) {
    const id = storyteller.index.get(word);
    if (id === undefined) return null;
    ids.push(id);
  }
  return ids;
}

/** Words the storyteller never read, in the order they come. */
export function unknownWords(storyteller: Storyteller, text: string): string[] {
  return storyWords(text).filter((word) => !storyteller.index.has(word));
}

/** The writer's letter ids for `text`; a letter it does not know becomes a space. */
export function letterIds(writer: Pick<LetterWriter, "letters">, text: string): number[] {
  const space = writer.letters.indexOf(" ");
  return [...text].map((letter) => {
    const id = writer.letters.indexOf(letter);
    return id < 0 ? space : id;
  });
}

export function lettersOf(writer: Pick<LetterWriter, "letters">, ids: readonly number[]): string {
  return ids.map((id) => writer.letters[id] ?? "").join("");
}
