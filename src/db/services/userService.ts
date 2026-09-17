import { prisma } from "../client.js";
import { User } from "@prisma/client";

export interface UpsertUserData {
  telegramId: bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * Finds or creates a user by Telegram ID and updates profile info.
 */
export async function getOrCreateUser(data: UpsertUserData): Promise<User> {
  return prisma.user.upsert({
    where: { telegramId: data.telegramId },
    update: {
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
    },
    create: {
      telegramId: data.telegramId,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      sharkPoints: 0n,
    },
  });
}

/**
 * Gets a user by Telegram ID.
 */
export async function getUserByTelegramId(telegramId: bigint): Promise<User | null> {
  return prisma.user.findUnique({
    where: { telegramId },
  });
}

/**
 * Atomically updates user's Shark Points balance with negative balance prevention.
 * Uses an interactive Prisma transaction to guarantee consistency and concurrency safety.
 */
export async function updateSharkPoints(
  telegramId: bigint,
  amount: bigint,
  type: string,
  options?: {
    referenceId?: string;
    description?: string;
  }
): Promise<{ user: User; previousBalance: bigint; newBalance: bigint }> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }

    const previousBalance = user.sharkPoints;
    const newBalance = previousBalance + amount;

    if (newBalance < 0n) {
      throw new Error("Insufficient Shark Points balance");
    }

    const updatedUser = await tx.user.update({
      where: { telegramId },
      data: { sharkPoints: newBalance },
    });

    await tx.pointTransaction.create({
      data: {
        userId: user.id,
        amount,
        balanceAfter: newBalance,
        type,
        referenceId: options?.referenceId,
        description: options?.description,
      },
    });

    return { user: updatedUser, previousBalance, newBalance };
  });
}

/**
 * Gets the top users for the Shark Points leaderboard.
 */
export async function getLeaderboard(limit = 10): Promise<User[]> {
  return prisma.user.findMany({
    orderBy: { sharkPoints: "desc" },
    take: limit,
  });
}

/**
 * Gets the leaderboard rank for a given user.
 */
export async function getUserRank(telegramId: bigint): Promise<{ rank: number; user: User | null; totalUsers: number }> {
  const user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (!user) {
    const totalUsers = await prisma.user.count();
    return { rank: 0, user: null, totalUsers };
  }

  const higherUsersCount = await prisma.user.count({
    where: {
      sharkPoints: {
        gt: user.sharkPoints,
      },
    },
  });

  const totalUsers = await prisma.user.count();
  return { rank: higherUsersCount + 1, user, totalUsers };
}

/**
 * Updates daily claim timestamp for user.
 */
export async function updateDailyClaimTime(userId: string, claimTime: Date): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { lastDailyClaim: claimTime },
  });
}
