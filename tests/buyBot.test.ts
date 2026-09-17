import { describe, it, expect, beforeEach } from "vitest";
import { buyMonitor, getRandomBuyMediaFile } from "../src/services/blockchain/buyMonitor.js";
import { formatBuyMessage } from "../src/services/blockchain/messageFormatter.js";
import { isTxAlreadyRecorded, recordBuyTransaction } from "../src/db/services/buyTxService.js";
import { prisma } from "../src/db/client.js";
import crypto from "node:crypto";

describe("Buy Bot & Message Formatter", () => {
  it("should format buy message with all required brand elements and links", () => {
    const event = {
      txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      chain: "Robinhood",
      tokenAddress: "0x0000000000000000000000000000000000000000",
      buyerAddress: "0x1111222233334444555566667777888899990000",
      amountTokens: 50000,
      tokenSymbol: "MSC",
      amountBase: 0.1,
      baseSymbol: "ETH",
      amountUsd: 250,
      marketCapUsd: 1250000,
      priceChange24h: 8.45,
      timestamp: Date.now(),
    };

    const formatted = formatBuyMessage(event);

    expect(formatted).toContain("MSC | New Buy");
    expect(formatted).toContain("0.1000 ETH");
    expect(formatted).toContain("($250.00)");
    expect(formatted).toContain("50,000.00 MSC");
    expect(formatted).toContain("Market Cap: $1,250,000.00");
    expect(formatted).toContain("+8.45%");
    expect(formatted).toContain("robinhoodchain.blockscout.com/tx/0x1234");
    expect(formatted).toContain("dexscreener.com");
    expect(formatted).toContain("millionairesharks.com");
  });

  it("should filter out purchases below the minimum threshold ($10 default)", async () => {
    const txHash = "0x" + crypto.randomBytes(32).toString("hex");
    const result = await buyMonitor.processBuyEvent({
      txHash,
      chain: "Robinhood",
      tokenAddress: "0x0000000000000000000000000000000000000000",
      buyerAddress: "0x1111222233334444555566667777888899990000",
      amountTokens: 50,
      tokenSymbol: "MSC",
      amountBase: 0.001,
      baseSymbol: "ETH",
      amountUsd: 5.0, // Below $10
      timestamp: Date.now(),
    });

    expect(result.sent).toBe(false);
    expect(result.reason).toContain("below minimum threshold");
  });

  it("should process purchases at or above threshold and reject duplicates", async () => {
    const txHash = "0x" + crypto.randomBytes(32).toString("hex");
    const event = {
      txHash,
      chain: "Robinhood",
      tokenAddress: "0x0000000000000000000000000000000000000000",
      buyerAddress: "0x1111222233334444555566667777888899990000",
      amountTokens: 2500,
      tokenSymbol: "MSC",
      amountBase: 0.02,
      baseSymbol: "ETH",
      amountUsd: 50.0, // >= $10
      timestamp: Date.now(),
    };

    // First processing: should pass
    const res1 = await buyMonitor.processBuyEvent(event);
    expect(res1.sent).toBe(true);

    // Verify saved to database
    const recorded = await isTxAlreadyRecorded(txHash);
    expect(recorded).toBe(true);

    // Second processing (duplicate): should be rejected
    const res2 = await buyMonitor.processBuyEvent(event);
    expect(res2.sent).toBe(false);
    expect(res2.reason).toContain("already been notified");
  });

  it("should handle random media lookup safely without crashing when empty", () => {
    const media = getRandomBuyMediaFile("./data/media");
    // Should be string if user has files, or null if folder has only README.txt
    expect(media === null || typeof media === "string").toBe(true);
  });
});
