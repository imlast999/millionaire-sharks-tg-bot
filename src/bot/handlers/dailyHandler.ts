import { Bot, Context } from "grammy";
import { getOrCreateUser, updateDailyClaimTime, updateSharkPoints } from "../../db/services/userService.js";
import { featureGuard } from "../middleware/featureGuard.js";
import { FEATURE_KEYS } from "../../features/types.js";
import { config } from "../../config/index.js";
import crypto from "node:crypto";

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Formats milliseconds into readable hours and minutes.
 */
function formatTimeRemaining(ms: number): string {
  const totalMinutes = Math.ceil(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function registerDailyHandler(bot: Bot) {
  // Command: /daily
  bot.command("daily", featureGuard(FEATURE_KEYS.DAILY_SHARK), async (ctx: Context) => {
    const from = ctx.from;
    if (!from) return;

    const telegramId = BigInt(from.id);
    const user = await getOrCreateUser({
      telegramId,
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
    });

    const now = new Date();

    // Check 24h cooldown
    if (user.lastDailyClaim) {
      const elapsed = now.getTime() - user.lastDailyClaim.getTime();
      if (elapsed < COOLDOWN_MS) {
        const remaining = COOLDOWN_MS - elapsed;
        const timeStr = formatTimeRemaining(remaining);
        await ctx.reply(
          `🦈 *DAILY SHARK REWARD*\n\n` +
            `You have already claimed your daily reward from the syndicate.\n` +
            `⏳ Please return in *${timeStr}* for your next reward.\n\n` +
            `💰 *Current Balance:* \`${user.sharkPoints.toString()} SP\``,
          { parse_mode: "Markdown" }
        );
        return;
      }
    }

    // Generate random reward between DAILY_MIN_POINTS and DAILY_MAX_POINTS inclusive
    const min = config.DAILY_MIN_POINTS;
    const max = config.DAILY_MAX_POINTS;
    const pointsAwarded = BigInt(crypto.randomInt(min, max + 1));

    // Update daily claim timestamp and balance atomically
    await updateDailyClaimTime(user.id, now);
    const { newBalance } = await updateSharkPoints(
      telegramId,
      pointsAwarded,
      "DAILY_CLAIM",
      { description: "Daily Shark check-in reward" }
    );

    await ctx.reply(
      `🦈 *DAILY SHARK*\n` +
        `The syndicate rewards those who return.\n\n` +
        `✨ You received *+${pointsAwarded.toString()} Shark Points*!\n` +
        `💰 *New Balance:* \`${newBalance.toString()} SP\`\n\n` +
        `Come back tomorrow for another reward.`,
      { parse_mode: "Markdown" }
    );
  });
}
