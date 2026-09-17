import { Bot, Context } from "grammy";
import { featureGuard } from "../middleware/featureGuard.js";
import { FEATURE_KEYS } from "../../features/types.js";
import { getLeaderboard, getUserRank, getOrCreateUser } from "../../db/services/userService.js";

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

export function registerLeaderboardHandlers(bot: Bot) {
  // Command: /leaderboard
  bot.command("leaderboard", featureGuard(FEATURE_KEYS.LEADERBOARD), async (ctx: Context) => {
    const topUsers = await getLeaderboard(10);

    if (topUsers.length === 0) {
      await ctx.reply("🏆 *SHARKS LEADERBOARD*\n\nNo sharks in the syndicate ranking yet!", {
        parse_mode: "Markdown",
      });
      return;
    }

    const medals = ["👑 1.", "🥈 2.", "🥉 3."];
    const lines = topUsers.map((u, i) => {
      const prefix = medals[i] || `🦈 ${i + 1}.`;
      const name = u.username ? `@${u.username}` : u.firstName || "Shark";
      const safeName = escapeMarkdown(name);
      return `${prefix} *${safeName}* — \`${u.sharkPoints.toString()} SP\``;
    });

    const msg =
      `🏆 *MILLIONAIRE SHARKS LEADERBOARD*\n` +
      `_The most affluent predators in the syndicate waters_\n\n` +
      lines.join("\n") +
      `\n\nCheck your rank with \`/rank\`.`;

    await ctx.reply(msg, { parse_mode: "Markdown" });
  });

  // Command: /rank
  bot.command("rank", featureGuard(FEATURE_KEYS.LEADERBOARD), async (ctx: Context) => {
    const from = ctx.from;
    if (!from) return;

    const telegramId = BigInt(from.id);
    await getOrCreateUser({
      telegramId,
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
    });

    const { rank, user, totalUsers } = await getUserRank(telegramId);
    const balance = user?.sharkPoints.toString() || "0";
    const name = escapeMarkdown(from.first_name || from.username || "Shark");

    await ctx.reply(
      `🦈 *SHARK SYNDICATE RANK*\n\n` +
        `Member: *${name}*\n` +
        `🏆 Leaderboard Position: *#${rank}* of ${totalUsers}\n` +
        `💰 Total Balance: \`${balance} Shark Points\``,
      { parse_mode: "Markdown" }
    );
  });
}
