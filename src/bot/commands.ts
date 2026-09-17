import { Bot } from "grammy";
import { FEATURE_KEYS } from "../features/types.js";
import { featureManager } from "../features/featureManager.js";

/**
 * Synchronizes the list of available commands with Telegram's menu (auto-complete upon typing /).
 * Dynamically registers Phase 2 commands when their feature flags are enabled.
 */
export async function syncBotCommands(bot: Bot): Promise<void> {
  const commands: { command: string; description: string }[] = [
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
