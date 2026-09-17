import { prisma } from "../client.js";
import { CasinoGame } from "@prisma/client";
import { updateSharkPoints } from "./userService.js";

export interface CreateGameParams {
  userId: string;
  telegramId: bigint;
  gameType: "DICE" | "COINFLIP" | "BLACKJACK";
  wager: bigint;
  stateJson?: string;
}

/**
 * Initiates a casino game by atomically deducting the wager from the user's Shark Points.
 */
export async function startCasinoGame(params: CreateGameParams): Promise<CasinoGame> {
  // Deduct wager atomically
  const { newBalance } = await updateSharkPoints(
    params.telegramId,
    -params.wager,
    "CASINO_WAGER",
    { description: `Wager for ${params.gameType} game` }
  );

  return prisma.casinoGame.create({
    data: {
      userId: params.userId,
      gameType: params.gameType,
      wager: params.wager,
      outcome: "PENDING",
      stateJson: params.stateJson,
    },
  });
}

/**
 * Resolves a casino game: updates outcome, state, and credits payout if won or pushed.
 */
export async function resolveCasinoGame(
  gameId: string,
  telegramId: bigint,
  outcome: "WIN" | "LOSS" | "PUSH",
  payout: bigint,
  finalStateJson?: string
): Promise<CasinoGame> {
  if (payout > 0n) {
    await updateSharkPoints(
      telegramId,
      payout,
      outcome === "PUSH" ? "CASINO_PUSH" : "CASINO_PAYOUT",
      { referenceId: gameId, description: `Casino payout for ${outcome}` }
    );
  }

  return prisma.casinoGame.update({
    where: { id: gameId },
    data: {
      outcome,
      payout,
      stateJson: finalStateJson,
    },
  });
}

/**
 * Retrieves an active (PENDING) game for a user (e.g. unfinished Blackjack hand).
 */
export async function getActiveGame(userId: string, gameType: string): Promise<CasinoGame | null> {
  return prisma.casinoGame.findFirst({
    where: {
      userId,
      gameType,
      outcome: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });
}
