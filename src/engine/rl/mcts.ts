/**
 * Thinking ahead by imagining games (Monte Carlo tree search). From the position on the board it
 * plays a fixed number of imagined games. Each one walks down the tree of moves it has imagined
 * so far, picking moves that went well or have hardly been tried (UCB1), adds one new move to the
 * tree, then finishes the game with random moves (for at most `length` moves; a game cut short
 * counts as half a win) and credits every move on its way with the result. It plays the move it
 * imagined most often. Seeded, and worked in steps of any size: however the games are sliced,
 * the same seed imagines the same games and picks the same move.
 *
 * With `games: 0` it only looks one move ahead: it checks whether any of its own moves wins at
 * once, and otherwise drops in the column nearest the middle. It never imagines a reply.
 */
import { createRandom } from "../random";
import {
  canDrop,
  copyBoard,
  drop,
  MIDDLE_FIRST,
  openColumns,
  winsWith,
  type Board,
  type Player,
} from "./connect-four";

export type SearchSettings = {
  /** Imagined games per move; 0 looks one move ahead only. */
  games: number;
  /** Random moves that finish each imagined game, at most. */
  length: number;
};

/** How much an imagined game favours rarely tried moves over ones that went well (UCB1's c). */
export const EXPLORE = Math.SQRT2;

type Node = {
  column: number;
  /** The player who dropped the disc that led here. */
  player: Player;
  visits: number;
  /** Imagined games won by `player` through here (a draw or a game cut short is half). */
  wins: number;
  children: Node[];
  /** Moves from here not yet in the tree, in the order they will be added. */
  untried: number[];
  parent: Node | null;
};

/** One imagined move as the bloom draws it: how often it was imagined, and how it went. */
export type Branch = {
  column: number;
  visits: number;
  /** Share of the imagined games through here won by the player who made this move, 0–1. */
  winShare: number;
  children: Branch[];
};

export type Search = {
  /** Imagined games (or one-move looks) it will make in all. */
  readonly total: number;
  /** Imagined games (or looks) made so far. */
  readonly done: number;
  readonly finished: boolean;
  /** Imagines up to `count` more games; returns how many it imagined. */
  step(count: number): number;
  /** The tree so far: the moves from here, each with up to `depth - 1` levels of replies. */
  bloom(depth?: number): Branch[];
  /** The column it would play now (its most imagined move); -1 when the game is over. */
  choice(): number;
};

const newNode = (column: number, player: Player, board: Board, parent: Node | null): Node => ({
  column,
  player,
  visits: 0,
  wins: 0,
  children: [],
  untried: board.outcome === 0 ? MIDDLE_FIRST.filter((at) => canDrop(board, at)) : [],
  parent,
});

const toBranch = (node: Node, depth: number): Branch => ({
  column: node.column,
  visits: node.visits,
  winShare: node.visits > 0 ? node.wins / node.visits : 0,
  children:
    depth > 1
      ? [...node.children]
          .sort((a, b) => a.column - b.column)
          .map((child) => toBranch(child, depth - 1))
      : [],
});

/** Most imagined first; ties go to the better result, then to the column nearer the middle. */
function favourite(children: readonly Node[]): Node | undefined {
  let best: Node | undefined;
  for (const child of children) {
    if (
      !best ||
      child.visits > best.visits ||
      (child.visits === best.visits && child.wins > best.wins)
    )
      best = child;
  }
  return best;
}

/** The one-move-ahead player: a move that wins at once, or else the column nearest the middle. */
export function oneMoveAhead(board: Board): number {
  if (board.outcome !== 0) return -1;
  const scratch = copyBoard(board);
  const winning = MIDDLE_FIRST.find((column) => winsWith(scratch, column));
  return winning ?? MIDDLE_FIRST.find((column) => canDrop(board, column)) ?? -1;
}

function lookOneMoveAhead(board: Board): Search {
  const scratch = copyBoard(board);
  const columns = board.outcome === 0 ? MIDDLE_FIRST.filter((at) => canDrop(board, at)) : [];
  const looks: Branch[] = [];
  const pick = oneMoveAhead(board);
  return {
    total: columns.length,
    get done() {
      return looks.length;
    },
    get finished() {
      return looks.length === columns.length;
    },
    step(count) {
      const before = looks.length;
      while (looks.length < columns.length && looks.length - before < count) {
        const column = columns[looks.length] ?? 0;
        looks.push({
          column,
          visits: 1,
          winShare: winsWith(scratch, column) ? 1 : 0.5,
          children: [],
        });
      }
      return looks.length - before;
    },
    bloom: () => [...looks].sort((a, b) => a.column - b.column),
    choice: () => pick,
  };
}

/** A search from `board` for the player whose turn it is. */
export function createSearch(board: Board, settings: SearchSettings, seed: number): Search {
  const games = Math.max(0, Math.floor(settings.games));
  if (games === 0) return lookOneMoveAhead(board);
  const length = Math.max(0, Math.floor(settings.length));
  const random = createRandom(seed);
  const start = copyBoard(board);
  // The root "move" was made by the player who is not to move.
  const root = newNode(-1, start.turn === 1 ? 2 : 1, start, null);
  let done = 0;
  const total = start.outcome === 0 ? games : 0;

  const imagine = () => {
    const game = copyBoard(start);
    let node = root;
    // Down the tree, through moves already imagined.
    while (node.untried.length === 0 && node.children.length > 0) {
      const logParent = Math.log(node.visits);
      let best = node.children[0] as Node;
      let bestScore = -Infinity;
      for (const child of node.children) {
        const score =
          child.visits === 0
            ? Infinity
            : child.wins / child.visits + EXPLORE * Math.sqrt(logParent / child.visits);
        if (score > bestScore) {
          bestScore = score;
          best = child;
        }
      }
      node = best;
      drop(game, node.column);
    }
    // One new move.
    const column = node.untried.shift();
    if (column !== undefined) {
      const mover = game.turn;
      drop(game, column);
      const child = newNode(column, mover, game, node);
      node.children.push(child);
      node = child;
    }
    // The rest of the game at random, cut short after `length` moves.
    for (let moves = 0; game.outcome === 0 && moves < length; moves += 1) {
      const open = openColumns(game);
      drop(game, open[random.int(open.length)] ?? 0);
    }
    // Every move on the way gets the result, from its own player's side.
    for (let at: Node | null = node; at; at = at.parent) {
      at.visits += 1;
      if (game.outcome === at.player) at.wins += 1;
      else if (game.outcome === 0 || game.outcome === "draw") at.wins += 0.5;
    }
    done += 1;
  };

  return {
    total,
    get done() {
      return done;
    },
    get finished() {
      return done >= total;
    },
    step(count) {
      const before = done;
      while (done < total && done - before < count) imagine();
      return done - before;
    },
    bloom: (depth = 3) =>
      [...root.children].sort((a, b) => a.column - b.column).map((child) => toBranch(child, depth)),
    choice: () => {
      if (start.outcome !== 0) return -1;
      return favourite(root.children)?.column ?? oneMoveAhead(start);
    },
  };
}

/** Thinks a move through to the end at once (for tests and the engine's own games). */
export function think(board: Board, settings: SearchSettings, seed: number): number {
  const search = createSearch(board, settings, seed);
  search.step(search.total);
  return search.choice();
}
