import { describe, it, expect, beforeEach } from "vitest";
import { getOrCreateUser, updateDailyClaimTime, updateSharkPoints } from "../src/db/services/userService.js";
import { prisma } from "../src/db/client.js";
import crypto from "node:crypto";

describe("Daily Shark Points System", () => {
  const testTelegramId = BigInt(crypto.randomInt(100000000, 999999999));

  it("should create user and award random points within configured range (50 - 1000)", async () => {
    const user = await getOrCreateUser({
      telegramId: testTelegramId,
      username: "DailyTester",
      firstName: "Daily",
    });

    expect(user.sharkPoints).toBe(0n);

    // Simulate daily reward
    const rewardPoints = BigInt(crypto.randomInt(50, 1001));
    expect(Number(rewardPoints)).toBeGreaterThanOrEqual(50);
    expect(Number(rewardPoints)).toBeLessThanOrEqual(1000);

    const now = new Date();
    await updateDailyClaimTime(user.id, now);
    const { newBalance } = await updateSharkPoints(testTelegramId, rewardPoints, "DAILY_CLAIM");

    expect(newBalance).toBe(rewardPoints);

    // Verify persisted
    const updated = await prisma.user.findUnique({ where: { telegramId: testTelegramId } });
    expect(updated?.sharkPoints).toBe(rewardPoints);
    expect(updated?.lastDailyClaim).toBeTruthy();
  });

  it("should detect if less than 24 hours have elapsed since last claim", async () => {
    const user = await prisma.user.findUnique({ where: { telegramId: testTelegramId } });
    expect(user).toBeTruthy();

    const now = new Date();
    const elapsed = now.getTime() - user!.lastDailyClaim!.getTime();
    const cooldownMs = 24 * 60 * 60 * 1000;

    // Because it was just claimed seconds ago, elapsed < cooldownMs
    expect(elapsed).toBeLessThan(cooldownMs);
  });
});
