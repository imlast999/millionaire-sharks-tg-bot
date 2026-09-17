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

import { FEATURE_KEYS } from "../features/types.js";
import { featureManager } from "../features/featureManager.js";

/**
 * Synchronizes the list of available commands with Telegram's menu (auto-complete upon typing /).
 * Only registers Phase 2 commands when their feature flags are enabled.
 */
export async function syncBotCommands(bot: Bot): Promise<void> {
  const commands: { command: string; description: string }[] = [
    { command: "start", description: "Welcome to Millionaire Sharks" },
    { command: "ca", description: "Token Contract Address" },
    { command: "help", description: "Syndicate bot guide" },
  ];

  if (await featureManager.isEnabled(FEATURE_KEYS.DAILY_SHARK)) {
    commands.push({ command: "daily", description: "Claim daily Shark Points reward" });
  }
  if (await featureManager.isEnabled(FEATURE_KEYS.CASINO)) {
    commands.push({ command: "casino", description: "Shark Points Casino Lounge" });
    commands.push({ command: "dice", description: "Roll virtual dice" });
    commands.push({ command: "flip", description: "Flip gold shark coin" });
    commands.push({ command: "blackjack", description: "Play VIP Blackjack" });
  }
  if (await featureManager.isEnabled(FEATURE_KEYS.LEADERBOARD)) {
    commands.push({ command: "leaderboard", description: "Top Shark Points holders" });
    commands.push({ command: "rank", description: "Check your rank and balance" });
  }
  if (await featureManager.isEnabled(FEATURE_KEYS.GIVEAWAYS)) {
    commands.push({ command: "giveaway", description: "View or enter community giveaways" });
  }

  try {
    await bot.api.setMyCommands(commands);
    console.log(`[Bot] Registered ${commands.length} commands with Telegram menu.`);
  } catch (err: any) {
    console.warn(`[Bot] Could not set Telegram commands: ${err.message}`);
  }
}

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

  // General /start and /help command
  bot.command("start", async (ctx) => {
    const name = ctx.from?.first_name || "Shark";
    const msg =
      `🦈 *WELCOME TO THE MILLIONAIRE SHARKS SYNDICATE*\n\n` +
      `Greetings, *${name}*. You are in the official waters of Millionaire Sharks.\n\n` +
      `🔥 *Active Modules:*\n` +
      `• *Buy Bot*: Real-time DEX purchase announcements\n` +
      `• *Syndicate Moderation*: Welcome and club security\n\n` +
      `_Additional VIP features (Daily Shark Points, Casino, Leaderboard, Giveaways) will roll out directly in these waters._\n\n` +
      `Stay sharp and swim with the sharks.`;

    await ctx.reply(msg, { parse_mode: "Markdown" });
  });

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
      `• \`/start\` — Welcome greeting\n` +
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
