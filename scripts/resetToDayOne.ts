import { featureManager } from "../src/features/featureManager.js";
import { FEATURE_KEYS } from "../src/features/types.js";
import { prisma, disconnectDb } from "../src/db/client.js";

async function run() {
  console.log("Resetting feature flags to Day One configuration...");
  try {
    await prisma.$connect();
    await featureManager.initialize();

    await featureManager.setEnabled(FEATURE_KEYS.BUY_BOT, true);
    await featureManager.setEnabled(FEATURE_KEYS.WELCOME_BOT, true);
    await featureManager.setEnabled(FEATURE_KEYS.DAILY_SHARK, false);
    await featureManager.setEnabled(FEATURE_KEYS.CASINO, false);
    await featureManager.setEnabled(FEATURE_KEYS.LEADERBOARD, false);
    await featureManager.setEnabled(FEATURE_KEYS.GIVEAWAYS, false);

    console.log("✅ Reset to Day One complete (Buy Bot & Welcome Bot active; Phase 2 disabled).");
  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    await disconnectDb();
    process.exit(0);
  }
}

run();
