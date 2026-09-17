import { createBot, syncBotCommands } from "./bot/bot.js";
import { featureManager } from "./features/featureManager.js";
import { buyMonitor } from "./services/blockchain/buyMonitor.js";
import { prisma, disconnectDb } from "./db/client.js";
import { config } from "./config/index.js";

async function main() {
  console.log("=========================================");
  console.log("🦈 STARTING MILLIONAIRE SHARKS COMMUNITY BOT");
  console.log("=========================================");

  // 1. Check Database connection & initialize feature flags
  try {
    await prisma.$connect();
    console.log("✅ Database connection established.");
    await featureManager.initialize();
    console.log("✅ Feature flags initialized.");
  } catch (err: any) {
    console.error("❌ Failed to initialize database:", err.message);
    process.exit(1);
  }

  // 2. Display initial feature flag status
  const states = await featureManager.getAllStates();
  console.log("\n--- Feature Flags Configuration ---");
  for (const s of states) {
    console.log(`  ${s.enabled ? "[ACTIVE]  " : "[DISABLED]"} ${s.key.padEnd(15)} (${s.name})`);
  }
  console.log("------------------------------------\n");

  // 3. Create bot instance
  const bot = createBot();

  // 4. Start Buy Monitor worker
  buyMonitor.start(bot);

  // 5. Start Telegram bot
  console.log("🚀 Starting Telegram Bot polling...");
  bot.start({
    onStart: async (botInfo) => {
      console.log(`🦈 Bot @${botInfo.username} is running in the Millionaire Sharks waters!`);
      await syncBotCommands(bot);
    },
  });

  // 6. Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    buyMonitor.stop();
    await bot.stop();
    await disconnectDb();
    console.log("👋 Millionaire Sharks Bot stopped successfully.");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
