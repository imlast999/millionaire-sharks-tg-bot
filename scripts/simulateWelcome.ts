import { Bot } from "grammy";
import { config } from "../src/config/index.js";
import {
  getRandomWelcomeMessage,
  getRandomGoodbyeMessage,
  getRandomBanMessage,
} from "../src/bot/handlers/welcomeGoodbyeHandler.js";

async function run() {
  console.log("=========================================");
  console.log("🦈 MILLIONAIRE SHARKS — WELCOME/GOODBYE SIMULATOR");
  console.log("=========================================\n");

  const mode = process.argv[2]?.toLowerCase() || "join"; // 'join', 'leave', 'ban', or 'all'
  const bot = config.BOT_TOKEN ? new Bot(config.BOT_TOKEN) : undefined;

  if (bot) {
    console.log(`🤖 Bot loaded. Alerts will be delivered to Telegram chat (${config.COMMUNITY_CHAT_ID}).\n`);
  } else {
    console.log("⚠️ No BOT_TOKEN found. Only console preview will be generated.\n");
  }

  const simulatedUser = "*SUJETO_DE_PRUEBA*";

  if (mode === "join" || mode === "all") {
    const welcomeMsg = getRandomWelcomeMessage(simulatedUser);
    console.log("--- 1. Simulating New Member Joined Group ---");
    console.log(`Message: "${welcomeMsg}"\n`);

    if (bot) {
      try {
        await bot.api.sendMessage(config.COMMUNITY_CHAT_ID, welcomeMsg, {
          parse_mode: "Markdown",
        });
        console.log(`✅ Welcome message successfully delivered to Telegram chat ${config.COMMUNITY_CHAT_ID}!`);
      } catch (err: any) {
        console.error(`❌ Failed to deliver welcome message: ${err.message}`);
      }
    }
  }

  if (mode === "leave" || mode === "all") {
    const goodbyeMsg = getRandomGoodbyeMessage(simulatedUser);
    console.log("\n--- 2. Simulating Member Left Group Voluntarily ---");
    console.log(`Message: "${goodbyeMsg}"\n`);

    if (bot) {
      try {
        await bot.api.sendMessage(config.COMMUNITY_CHAT_ID, goodbyeMsg, {
          parse_mode: "Markdown",
        });
        console.log(`✅ Goodbye message successfully delivered to Telegram chat ${config.COMMUNITY_CHAT_ID}!`);
      } catch (err: any) {
        console.error(`❌ Failed to deliver goodbye message: ${err.message}`);
      }
    }
  }

  if (mode === "ban" || mode === "all") {
    const banMsg = getRandomBanMessage(simulatedUser);
    console.log("\n--- 3. Simulating Member Banned / Kicked by Admin ---");
    console.log(`Message: "${banMsg}"\n`);

    if (bot) {
      try {
        await bot.api.sendMessage(config.COMMUNITY_CHAT_ID, banMsg, {
          parse_mode: "Markdown",
        });
        console.log(`✅ Ban security message successfully delivered to Telegram chat ${config.COMMUNITY_CHAT_ID}!`);
      } catch (err: any) {
        console.error(`❌ Failed to deliver ban message: ${err.message}`);
      }
    }
  }

  console.log("\n=========================================");
  console.log("✅ Simulation complete.");
  console.log("Usage options:");
  console.log("• pnpm run simulate:welcome         (Sends 1 welcome message)");
  console.log("• pnpm run simulate:welcome leave   (Sends 1 goodbye message)");
  console.log("• pnpm run simulate:welcome ban     (Sends 1 ban security message)");
  console.log("• pnpm run simulate:welcome all     (Sends join, leave, and ban)");
  console.log("=========================================");
  process.exit(0);
}

run();
