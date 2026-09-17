import { Bot } from "grammy";
import { limit } from "@grammyjs/ratelimiter";
import { config } from "../config/index.js";
import { globalErrorHandler } from "./middleware/errorHandler.js";
import { registerWelcomeGoodbyeHandlers } from "./handlers/welcomeGoodbyeHandler.js";
import { registerDailyHandler } from "./handlers/dailyHandler.js";
import { registerCasinoHandlers } from "./handlers/casinoHandler.js";
import { registerLeaderboardHandlers } from "./handlers/leaderboardHandler.js";
import { registerGiveawayHandlers } from "./handlers/giveawayHandler.js";
import { registerAdminHandlers } from "./handlers/adminHandler.js";

import { syncBotCommands } from "./commands.js";
export { syncBotCommands };

/**
 * Creates and initializes the single, unified Telegram Bot instance.
 */
export function createBot(): Bot {
  const bot = new Bot(config.BOT_TOKEN);

  // Rate limiting middleware: max 3 requests per second per user (prevents spam abuse)
  bot.use(
    limit({
      timeFrame: 1000,
      limit: 3,
      onLimitExceeded: async (ctx) => {
        if (ctx.chat?.type === "private") {
          await ctx.reply("⚠️ Slow down, Shark! You are sending commands too quickly.");
        }
      },
      keyGenerator: (ctx) => {
        return ctx.from?.id.toString();
      },
    })
  );

  // Global error handler
  bot.catch(globalErrorHandler);

  // Register all feature modules
  registerWelcomeGoodbyeHandlers(bot);
  registerDailyHandler(bot);
  registerCasinoHandlers(bot);
  registerLeaderboardHandlers(bot);
  registerGiveawayHandlers(bot);
  registerAdminHandlers(bot);

  // /ca command: returns only the token contract address (monospace for 1-tap copy in Telegram)
  bot.command("ca", async (ctx) => {
    const ca =
      config.TOKEN_CONTRACT_ADDRESS &&
        config.TOKEN_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000"
        ? config.TOKEN_CONTRACT_ADDRESS
        : "No CA yet. Announcement Soon...";

    await ctx.reply(`\`${ca}\``, { parse_mode: "Markdown" });
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      `🦈 *MILLIONAIRE SHARKS COMMUNITY BOT*\n\n` +
      `• \`/ca\` — Token contract address\n` +
      `• \`/daily\` — Claim daily Shark Points (when active)\n` +
      `• \`/casino\` — Virtual casino lounge (when active)\n` +
      `• \`/leaderboard\` — Top Shark Points holders\n` +
      `• \`/rank\` — Check your syndicate status\n` +
      `• \`/giveaway\` — Community giveaways\n` +
      `• \`/admin\` — Executive syndicate dashboard (Admins only)`,
      { parse_mode: "Markdown" }
    );
  });

  return bot;
}
