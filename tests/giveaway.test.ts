import { describe, it, expect } from "vitest";
import {
  createGiveaway,
  enterGiveaway,
  endGiveaway,
  getParticipantCount,
} from "../src/db/services/giveawayService.js";
import { getOrCreateUser, updateSharkPoints } from "../src/db/services/userService.js";
import crypto from "node:crypto";

describe("Giveaway System", () => {
  it("should create giveaway, register eligible participants, block duplicates & underfunded users, and pick winners", async () => {
    const adminId = BigInt(crypto.randomInt(100000000, 999999999));
    const user1Id = BigInt(crypto.randomInt(100000000, 999999999));
    const user2Id = BigInt(crypto.randomInt(100000000, 999999999));

    // User 1 has 500 SP, User 2 has 20 SP
    const u1 = await getOrCreateUser({ telegramId: user1Id, username: "SharkRich" });
    await updateSharkPoints(user1Id, 500n, "TEST_CREDIT");

    const u2 = await getOrCreateUser({ telegramId: user2Id, username: "SharkPoor" });
    await updateSharkPoints(user2Id, 20n, "TEST_CREDIT");

    // Create giveaway requiring 100 SP
    const endsAt = new Date(Date.now() + 60 * 60 * 1000);
    const giveaway = await createGiveaway({
      title: "Test Syndicate Giveaway",
      prizeDescription: "1000 Shark Points + VIP Role",
      winnersCount: 1,
      minSharkPoints: 100n,
      endsAt,
      createdBy: adminId,
    });

    expect(giveaway.id).toBeTruthy();
    expect(giveaway.status).toBe("ACTIVE");

    // User 2 tries to enter with only 20 SP (requires 100) -> must fail
    const enterU2 = await enterGiveaway(giveaway.id, u2.id, 20n);
    expect(enterU2.success).toBe(false);
    expect(enterU2.reason).toContain("need at least 100 Shark Points");

    // User 1 enters with 500 SP -> succeeds
    const enterU1 = await enterGiveaway(giveaway.id, u1.id, 500n);
    expect(enterU1.success).toBe(true);

    // User 1 tries to enter again (duplicate) -> must fail
    const enterU1Dup = await enterGiveaway(giveaway.id, u1.id, 500n);
    expect(enterU1Dup.success).toBe(false);
    expect(enterU1Dup.reason).toContain("already entered");

    const count = await getParticipantCount(giveaway.id);
    expect(count).toBe(1);

    // End giveaway and verify winner
    const result = await endGiveaway(giveaway.id);
    expect(result.winners.length).toBe(1);
    expect(result.winners[0].userId).toBe(u1.id);
    expect(result.giveaway.status).toBe("ACTIVE"); // before update return
  });
});
