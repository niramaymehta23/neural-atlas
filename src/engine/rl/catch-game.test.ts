import { createRandom } from "../random";
import {
  CATCH_COLUMNS,
  CATCH_INPUTS,
  catchInputs,
  EVERY_DROP,
  moveBasket,
  playDrop,
  randomCatchChance,
  randomDrop,
} from "./catch-game";

describe("catch the fruit", () => {
  it("drops the fruit a row per move and pays only at the bottom", () => {
    const first = moveBasket({ fruitRow: 0, fruitColumn: 2, basket: 0 }, 2);
    expect(first).toEqual({
      next: { fruitRow: 1, fruitColumn: 2, basket: 1 },
      reward: 0,
      done: false,
      caught: false,
    });
    expect(moveBasket({ fruitRow: 3, fruitColumn: 2, basket: 1 }, 2)).toMatchObject({
      reward: 1,
      done: true,
      caught: true,
    });
    expect(moveBasket({ fruitRow: 3, fruitColumn: 2, basket: 1 }, 1)).toMatchObject({
      reward: -1,
      done: true,
      caught: false,
    });
  });

  it("stops the basket at the edges", () => {
    expect(moveBasket({ fruitRow: 0, fruitColumn: 0, basket: 0 }, 0).next.basket).toBe(0);
    const right = CATCH_COLUMNS - 1;
    expect(moveBasket({ fruitRow: 0, fruitColumn: 0, basket: right }, 2).next.basket).toBe(right);
  });

  it("can always be won: a basket that heads for the fruit catches every test drop", () => {
    expect(EVERY_DROP).toHaveLength(25);
    for (const drop of EVERY_DROP) {
      const chase = playDrop(drop, (now) => Math.sign(now.fruitColumn - now.basket) + 1);
      expect(chase.caught).toBe(true);
      expect(chase.positions).toHaveLength(5);
    }
  });

  it("gives a basket moving at random exactly one catch in five", () => {
    expect(randomCatchChance()).toBeCloseTo(0.2, 12);
  });

  it("shows the network one mark per group", () => {
    const input = catchInputs({ fruitRow: 2, fruitColumn: 4, basket: 1 });
    expect(input).toHaveLength(CATCH_INPUTS);
    expect(input.reduce((sum, value) => sum + value, 0)).toBe(3);
    const random = createRandom(1);
    expect(randomDrop(random).fruitRow).toBe(0);
  });
});
