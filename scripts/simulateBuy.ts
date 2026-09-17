import { Bot } from "grammy";
import { config } from "../src/config/index.js";
import { buyMonitor } from "../src/services/blockchain/buyMonitor.js";
import { formatBuyMessage } from "../src/services/blockchain/messageFormatter.js";
import { featureManager } from "../src/features/featureManager.js";
import { prisma, disconnectDb } from "../src/db/client.js";
import crypto from "node:crypto";

async function run() {
  console.log("=========================================");
  console.log("🦈 MILLIONAIRE SHARKS — BUY SIMULATOR");
  console.log("=========================================\n");

  try {
    await prisma.$connect();
    await featureManager.initialize();

    const bot = config.BOT_TOKEN ? new Bot(config.BOT_TOKEN) : undefined;
    if (bot) {
      console.log(`🤖 Bot loaded (@${config.BOT_TOKEN.slice(0, 10)}...). Real alerts will be sent to COMMUNITY_CHAT_ID (${config.COMMUNITY_CHAT_ID}).\n`);
    }

    // Test 1: Small buy below $10 (e.g. $4.50)
    console.log("--- Test 1: Simulating small purchase ($4.50 USD) ---");
    const smallTxHash = "0x" + crypto.randomBytes(32).toString("hex");
    const res1 = await buyMonitor.processBuyEvent({
      txHash: smallTxHash,
      chain: "Robinhood",
      tokenAddress: "0x1234567890123456789012345678901234567890",
      buyerAddress: "0x71C...4f98",
      amountTokens: 450.0,
      tokenSymbol: "MSC",
      amountBase: 0.0018,
      baseSymbol: "ETH",
      amountUsd: 4.5,
      marketCapUsd: 500000,
      priceChange24h: 3.2,
      timestamp: Date.now(),
    }, bot);
    console.log(`Result: sent = ${res1.sent}, reason = "${res1.reason}"`);

    // Test 2: Standard qualifying buy ($85.50 USD)
    console.log("\n--- Test 2: Simulating qualifying purchase ($85.50 USD) ---");
    const qualifyingTxHash = "0x" + crypto.randomBytes(32).toString("hex");
    const qualifyingEvent = {
      txHash: qualifyingTxHash,
      chain: "Robinhood",
      tokenAddress: "0x1234567890123456789012345678901234567890",
      buyerAddress: "0x89C40a1b2c3d4e5f60718293a4b5c6d7e8f90123",
      amountTokens: 8550.0,
      tokenSymbol: "MSC",
      amountBase: 0.0342,
      baseSymbol: "ETH",
      amountUsd: 85.5,
      marketCapUsd: 512000,
      priceChange24h: 5.4,
      timestamp: Date.now(),
    };
    const res2 = await buyMonitor.processBuyEvent(qualifyingEvent, bot);
    console.log(`Result: sent = ${res2.sent}`);
    console.log("\nFormatted Telegram Message Preview:\n");
    console.log(formatBuyMessage(qualifyingEvent));

    // Test 3: Duplicate transaction check
    console.log("\n--- Test 3: Re-processing identical transaction hash ---");
    const res3 = await buyMonitor.processBuyEvent(qualifyingEvent, bot);
    console.log(`Result: sent = ${res3.sent}, reason = "${res3.reason}"`);

    // Test 4: Whale purchase ($5,000 USD)
    console.log("\n--- Test 4: Simulating Whale purchase ($5,000 USD) ---");
    const whaleTxHash = "0x" + crypto.randomBytes(32).toString("hex");
    const whaleEvent = {
      txHash: whaleTxHash,
      chain: "Robinhood",
      tokenAddress: "0x1234567890123456789012345678901234567890",
      buyerAddress: "0x9999999999999999999999999999999999999999",
      amountTokens: 500000.0,
      tokenSymbol: "MSC",
      amountBase: 2.0,
      baseSymbol: "ETH",
      amountUsd: 5000.0,
      marketCapUsd: 550000,
      priceChange24h: 18.75,
      timestamp: Date.now(),
    };
    const res4 = await buyMonitor.processBuyEvent(whaleEvent, bot);
    console.log(`Result: sent = ${res4.sent}`);
    console.log("\nFormatted Telegram Whale Message Preview:\n");
    console.log(formatBuyMessage(whaleEvent));
    console.log("\n=========================================");
    console.log("✅ Simulation complete.");
    console.log("=========================================");
  } catch (err: any) {
    console.error("Simulation error:", err.message);
  } finally {
    await disconnectDb();
    process.exit(0);
  }
}

run();
