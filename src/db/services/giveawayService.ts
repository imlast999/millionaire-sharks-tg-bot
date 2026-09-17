import { prisma } from "../client.js";
import { Giveaway, GiveawayParticipant, GiveawayWinner } from "@prisma/client";
import { updateSharkPoints } from "./userService.js";
import crypto from "node:crypto";

export interface CreateGiveawayParams {
  title: string;
  prizeDescription: string;
  winnersCount: number;
  minSharkPoints: bigint;
  endsAt: Date;
  createdBy: bigint;
  chatId?: bigint;
  messageId?: number;
}

/**
 * Creates a new giveaway in the database.
 */
export async function createGiveaway(params: CreateGiveawayParams): Promise<Giveaway> {
  return prisma.giveaway.create({
    data: {
      title: params.title,
      prizeDescription: params.prizeDescription,
      winnersCount: params.winnersCount,
      minSharkPoints: params.minSharkPoints,
      endsAt: params.endsAt,
      createdBy: params.createdBy,
      chatId: params.chatId,
      messageId: params.messageId,
      status: "ACTIVE",
    },
  });
}

/**
 * Updates giveaway messageId and chatId after sending to Telegram.
 */
export async function updateGiveawayMessage(giveawayId: string, chatId: bigint, messageId: number): Promise<Giveaway> {
  return prisma.giveaway.update({
    where: { id: giveawayId },
    data: { chatId, messageId },
  });
}

/**
 * Enters a user into an active giveaway.
 * Enforces minimum Shark Points and prevents duplicate entries.
 */
export async function enterGiveaway(
  giveawayId: string,
  userId: string,
  userSharkPoints: bigint
): Promise<{ success: boolean; reason?: string; participant?: GiveawayParticipant }> {
  const giveaway = await prisma.giveaway.findUnique({
    where: { id: giveawayId },
  });

  if (!giveaway || giveaway.status !== "ACTIVE") {
    return { success: false, reason: "This giveaway is no longer active." };
  }

  if (new Date() > giveaway.endsAt) {
    return { success: false, reason: "This giveaway has already ended." };
  }

  if (userSharkPoints < giveaway.minSharkPoints) {
    return {
      success: false,
      reason: `You need at least ${giveaway.minSharkPoints} Shark Points to enter this giveaway. (Your balance: ${userSharkPoints} SP)`,
    };
  }

  const existing = await prisma.giveawayParticipant.findUnique({
    where: {
      giveawayId_userId: {
        giveawayId,
        userId,
      },
    },
  });

  if (existing) {
    return { success: false, reason: "You are already entered in this giveaway!" };
  }

  try {
    const participant = await prisma.giveawayParticipant.create({
      data: {
        giveawayId,
        userId,
      },
    });
    return { success: true, participant };
  } catch (error) {
    return { success: false, reason: "Failed to enter giveaway. Please try again." };
  }
}

/**
 * Gets participant count for a giveaway.
 */
export async function getParticipantCount(giveawayId: string): Promise<number> {
  return prisma.giveawayParticipant.count({
    where: { giveawayId },
  });
}

/**
 * Selects winners for an active giveaway using cryptographically secure randomness.
 */
export async function endGiveaway(
  giveawayId: string
): Promise<{ giveaway: Giveaway; winners: (GiveawayWinner & { user: { telegramId: bigint; username: string | null; firstName: string | null } })[] }> {
  const giveaway = await prisma.giveaway.findUnique({
    where: { id: giveawayId },
    include: {
      participants: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!giveaway) {
    throw new Error("Giveaway not found");
  }

  const eligibleParticipants = [...giveaway.participants];
  const winnersToPick = Math.min(giveaway.winnersCount, eligibleParticipants.length);
  const selectedWinners: typeof eligibleParticipants = [];

  for (let i = 0; i < winnersToPick; i++) {
    const randomIndex = crypto.randomInt(0, eligibleParticipants.length);
    const [winner] = eligibleParticipants.splice(randomIndex, 1);
    selectedWinners.push(winner);
  }

  const winners = await prisma.$transaction(async (tx) => {
    const updatedGiveaway = await tx.giveaway.update({
      where: { id: giveawayId },
      data: { status: "ENDED" },
    });

    const createdWinners = [];
    for (const entry of selectedWinners) {
      const winnerRecord = await tx.giveawayWinner.create({
        data: {
          giveawayId,
          userId: entry.userId,
          prize: giveaway.prizeDescription,
        },
        include: {
          user: {
            select: {
              telegramId: true,
              username: true,
              firstName: true,
            },
          },
        },
      });
      createdWinners.push(winnerRecord);
    }

    return createdWinners;
  });

  return { giveaway, winners };
}

/**
 * Gets currently active giveaways.
 */
export async function getActiveGiveaways(): Promise<Giveaway[]> {
  return prisma.giveaway.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Gets expired giveaways that need auto-closing.
 */
export async function getExpiredActiveGiveaways(): Promise<Giveaway[]> {
  return prisma.giveaway.findMany({
    where: {
      status: "ACTIVE",
      endsAt: {
        lte: new Date(),
      },
    },
  });
}
