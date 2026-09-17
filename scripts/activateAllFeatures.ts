import { featureManager } from "../src/features/featureManager.js";
import { prisma, disconnectDb } from "../src/db/client.js";

async function run() {
  console.log("=================================================");
  console.log("🦈 MILLIONAIRE SHARKS — FULL FEATURE ACTIVATION");
  console.log("=================================================");

  try {
    await prisma.$connect();
    await featureManager.initialize();

    console.log("🔍 Performing pre-flight checks...");
    const validation = await featureManager.validateReadiness();

    if (!validation.ok) {
      console.error("❌ Pre-flight checks failed:");
      for (const err of validation.errors) {
        console.error(`   - ${err}`);
      }
      process.exit(1);
    }

    console.log("✅ Pre-flight checks passed.");
    console.log("⚡ Activating all Phase 2 integrations...");

    const result = await featureManager.activateAllFeatures();

    console.log("\n=================================================");
    console.log("🎉 ACTIVATION REPORT:");
    console.log("=================================================");
    for (const state of result.states) {
      console.log(`  ✅ [ACTIVE] ${state.key.padEnd(16)}: ${state.name}`);
    }
    console.log("=================================================");
    console.log("All features (Daily Shark, Casino, Leaderboard, Giveaways) are now ENABLED!");
  } catch (err: any) {
    console.error("❌ Error during feature activation:", err.message);
  } finally {
    await disconnectDb();
    process.exit(0);
  }
}

run();
