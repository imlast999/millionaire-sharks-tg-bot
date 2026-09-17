import crypto from "node:crypto";

export interface DiceResult {
  roll: number;
  isWin: boolean;
  payoutMultiplier: number;
}

/**
 * Rolls a standard 6-sided die.
 * If user bets on high (4, 5, 6) vs low (1, 2, 3), or predicts exact number.
 * Default community mode: roll 4, 5, or 6 to double wager (2x payout, 50% chance).
 */
export function rollDice(prediction?: "high" | "low" | number): DiceResult {
  const roll = crypto.randomInt(1, 7); // 1 to 6 inclusive

  if (typeof prediction === "number") {
    // Exact roll: 6x multiplier
    const isWin = roll === prediction;
    return { roll, isWin, payoutMultiplier: isWin ? 5.8 : 0 };
  }

  // High (4-6) or Low (1-3)
  const isHigh = roll >= 4;
  const targetHigh = prediction === "low" ? false : true;
  const isWin = isHigh === targetHigh;

  return {
    roll,
    isWin,
    payoutMultiplier: isWin ? 1.95 : 0, // 1.95x payout (2.5% house edge for virtual economy)
  };
}
