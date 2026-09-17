import { describe, it, expect } from "vitest";
import {
  calculateHandValue,
  dealNewGame,
  hit,
  stand,
  createDeck,
} from "../src/services/casino/blackjackEngine.js";
import { rollDice } from "../src/services/casino/diceEngine.js";
import { flipCoin } from "../src/services/casino/coinflipEngine.js";
import { getOrCreateUser, updateSharkPoints } from "../src/db/services/userService.js";
import crypto from "node:crypto";

describe("Shark Points Casino Games", () => {
  describe("Balance Protection & Atomic Transactions", () => {
    it("should reject wagers exceeding user balance to prevent negative balances", async () => {
      const testId = BigInt(crypto.randomInt(100000000, 999999999));
      await getOrCreateUser({ telegramId: testId, username: "BrokeShark" });

      // Balance is 0, wager is 50 -> must reject
      await expect(
        updateSharkPoints(testId, -50n, "CASINO_WAGER")
      ).rejects.toThrow("Insufficient Shark Points balance");
    });
  });

  describe("Dice Game Engine", () => {
    it("should produce rolls between 1 and 6", () => {
      for (let i = 0; i < 50; i++) {
        const result = rollDice("high");
        expect(result.roll).toBeGreaterThanOrEqual(1);
        expect(result.roll).toBeLessThanOrEqual(6);
        if (result.isWin) {
          expect(result.payoutMultiplier).toBeGreaterThan(0);
        } else {
          expect(result.payoutMultiplier).toBe(0);
        }
      }
    });
  });

  describe("Coin Flip Engine", () => {
    it("should correctly resolve heads or tails", () => {
      const result = flipCoin("heads");
      expect(["heads", "tails"]).toContain(result.side);
      if (result.side === "heads") {
        expect(result.isWin).toBe(true);
        expect(result.payoutMultiplier).toBe(1.95);
      } else {
        expect(result.isWin).toBe(false);
        expect(result.payoutMultiplier).toBe(0);
      }
    });
  });

  describe("Blackjack Engine", () => {
    it("should accurately calculate soft and hard Ace values", () => {
      // Ace + 8 = 19 (Soft)
      const softHand = [{ suit: "♠️" as const, rank: "A" as const }, { suit: "♦️" as const, rank: "8" as const }];
      expect(calculateHandValue(softHand)).toEqual({ total: 19, isSoft: true });

      // Ace + 8 + 5 = 14 (Hard, Ace reduces to 1)
      const hardHand = [
        { suit: "♠️" as const, rank: "A" as const },
        { suit: "♦️" as const, rank: "8" as const },
        { suit: "♣️" as const, rank: "5" as const },
      ];
      expect(calculateHandValue(hardHand)).toEqual({ total: 14, isSoft: false });

      // Ace + Ace + 9 = 21
      const doubleAceHand = [
        { suit: "♠️" as const, rank: "A" as const },
        { suit: "♥️" as const, rank: "A" as const },
        { suit: "♣️" as const, rank: "9" as const },
      ];
      expect(calculateHandValue(doubleAceHand).total).toBe(21);
    });

    it("should deal initial 2 cards to player and dealer", () => {
      const state = dealNewGame(100n);
      expect(state.playerHand.length).toBe(2);
      expect(state.dealerHand.length).toBe(2);
      expect(state.wager).toBe("100");
    });

    it("should allow hitting and correctly bust if exceeding 21", () => {
      const state = {
        playerHand: [
          { suit: "♠️" as const, rank: "10" as const },
          { suit: "♦️" as const, rank: "10" as const },
        ],
        dealerHand: [
          { suit: "♣️" as const, rank: "10" as const },
          { suit: "♥️" as const, rank: "7" as const },
        ],
        deck: [{ suit: "♠️" as const, rank: "5" as const }], // Will bust player (25)
        wager: "100",
        isGameOver: false,
      };

      const afterHit = hit(state);
      expect(afterHit.playerHand.length).toBe(3);
      expect(afterHit.isGameOver).toBe(true);
      expect(afterHit.outcome).toBe("LOSS");
      expect(afterHit.payoutMultiplier).toBe(0);
    });

    it("should have dealer draw until 17+ on stand", () => {
      const state = {
        playerHand: [
          { suit: "♠️" as const, rank: "10" as const },
          { suit: "♦️" as const, rank: "8" as const }, // 18
        ],
        dealerHand: [
          { suit: "♣️" as const, rank: "10" as const },
          { suit: "♥️" as const, rank: "5" as const }, // 15 (must hit)
        ],
        deck: [{ suit: "♠️" as const, rank: "4" as const }], // Dealer hits 19
        wager: "100",
        isGameOver: false,
      };

      const final = stand(state);
      expect(final.isGameOver).toBe(true);
      // Dealer 19 beats Player 18
      expect(final.outcome).toBe("LOSS");
      expect(calculateHandValue(final.dealerHand).total).toBe(19);
    });
  });
});
