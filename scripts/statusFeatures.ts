import { featureManager } from "../src/features/featureManager.js";
import { prisma, disconnectDb } from "../src/db/client.js";

async function run() {
  console.log("=========================================");
  console.log("🦈 MILLIONAIRE SHARKS — FEATURE STATUS");
  console.log("=========================================");

  try {
    await prisma.$connect();
    await featureManager.initialize();

    const states = await featureManager.getAllStates();

    for (const state of states) {
      const icon = state.enabled ? "🟢 [ACTIVE]  " : "🔴 [DISABLED]";
      console.log(`  ${icon} ${state.key.padEnd(16)} - ${state.name}`);
    }
    console.log("=========================================");
  } catch (err: any) {
    console.error("❌ Error querying feature status:", err.message);
  } finally {
    await disconnectDb();
    process.exit(0);
  }
}

run();
