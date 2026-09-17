import crypto from "node:crypto";

export type CoinSide = "heads" | "tails";

export interface CoinflipResult {
  side: CoinSide;
  isWin: boolean;
  payoutMultiplier: number;
}

/**
 * Flips a virtual gold shark coin (50/50 probability).
 */
export function flipCoin(choice: CoinSide): CoinflipResult {
  const roll = crypto.randomInt(0, 2); // 0 = heads, 1 = tails
  const side: CoinSide = roll === 0 ? "heads" : "tails";
  const isWin = side === choice.toLowerCase();

  return {
    side,
    isWin,
    payoutMultiplier: isWin ? 1.95 : 0, // 1.95x payout
  };
}
