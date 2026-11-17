/**
 * Remembers the last answer: a fit is redone only when one of its inputs changes (compared with
 * `===`). Missions, guesses and the scene ask for the same fit many times per change.
 */
export function rememberLast<Args extends readonly unknown[], Result>(
  work: (...args: Args) => Result,
): (...args: Args) => Result {
  let last: { args: Args; result: Result } | null = null;
  return (...args: Args) => {
    if (last && last.args.length === args.length && last.args.every((arg, at) => arg === args[at]))
      return last.result;
    const result = work(...args);
    last = { args, result };
    return result;
  };
}
