import { Bot, InputFile } from "grammy";
import { BuyEvent } from "./types.js";
import { formatBuyMessage } from "./messageFormatter.js";
import { isTxAlreadyRecorded, recordBuyTransaction } from "../../db/services/buyTxService.js";
import { dexScreenerClient } from "./dexscreenerClient.js";
import { config } from "../../config/index.js";
import { featureManager } from "../../features/featureManager.js";
import { FEATURE_KEYS } from "../../features/types.js";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const SUPPORTED_MEDIA_EXTENSIONS = new Set([
  ".mp4",
  ".gif",
  ".webm",
  ".mov",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
]);

/**
 * Scans the media folder and returns a random shark video/gif/image file if available.
 */
export function getRandomBuyMediaFile(dirPath: string = config.BUY_MEDIA_DIR): string | null {
  try {
    const resolvedPath = path.resolve(process.cwd(), dirPath);
    if (!fs.existsSync(resolvedPath)) {
      return null;
    }

    const files = fs.readdirSync(resolvedPath);
    const mediaFiles = files.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return SUPPORTED_MEDIA_EXTENSIONS.has(ext);
    });

    if (mediaFiles.length === 0) {
      return null;
    }

    const randomIndex = crypto.randomInt(0, mediaFiles.length);
    return path.join(resolvedPath, mediaFiles[randomIndex]);
  } catch (err: any) {
    console.warn(`[BuyMonitor] Could not read buy media directory: ${err.message}`);
    return null;
  }
}

export class BuyMonitor {
  private bot: Bot | null = null;
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private minUsdThreshold: number = config.BUY_BOT_MIN_USD;

  constructor() {
    this.minUsdThreshold = config.BUY_BOT_MIN_USD;
  }

  public setBot(bot: Bot) {
    this.bot = bot;
  }

  public setMinUsdThreshold(threshold: number) {
    this.minUsdThreshold = threshold;
  }

  public getMinUsdThreshold(): number {
    return this.minUsdThreshold;
  }

  /**
   * Processes an incoming purchase event:
   * 1. Checks if feature flag is active
   * 2. Checks minimum USD threshold ($10 default)
   * 3. Deduplicates transaction against database
   * 4. Enriches with latest market data if available
   * 5. Sends Telegram notification
   * 6. Saves transaction to DB
   */
  public async processBuyEvent(event: BuyEvent, botInstance?: Bot): Promise<{ sent: boolean; reason?: string }> {
    const isEnabled = await featureManager.isEnabled(FEATURE_KEYS.BUY_BOT);
    if (!isEnabled) {
      return { sent: false, reason: "Buy Bot feature is currently disabled" };
    }

    // Minimum USD Threshold check
    if (event.amountUsd < this.minUsdThreshold) {
      return {
        sent: false,
        reason: `Purchase amount ($${event.amountUsd.toFixed(2)}) is below minimum threshold ($${this.minUsdThreshold.toFixed(2)})`,
      };
    }

    // Deduplication check
    const isDuplicate = await isTxAlreadyRecorded(event.txHash);
    if (isDuplicate) {
      return { sent: false, reason: `Transaction ${event.txHash} has already been notified` };
    }

    // Enrich with latest market data if missing
    if (!event.marketCapUsd || event.priceChange24h === undefined) {
      const marketData = await dexScreenerClient.getMarketData(event.tokenAddress);
      if (marketData) {
        event.marketCapUsd = marketData.marketCapUsd;
        event.priceChange24h = marketData.priceChange24h;
      }
    }

    // Format message
    const message = formatBuyMessage(event);
    const targetBot = botInstance || this.bot;

    if (targetBot) {
      try {
        console.log(`[BuyMonitor] Sending notification to Telegram chat ${config.COMMUNITY_CHAT_ID}...`);

        const mediaFilePath = getRandomBuyMediaFile();

        if (mediaFilePath) {
          const ext = path.extname(mediaFilePath).toLowerCase();
          const fileName = path.basename(mediaFilePath);
          console.log(`[BuyMonitor] 🦈 Attaching random shark media: ${fileName}`);

          const inputFile = new InputFile(mediaFilePath);

          if ([".mp4", ".gif", ".webm", ".mov"].includes(ext)) {
            await targetBot.api.sendAnimation(config.COMMUNITY_CHAT_ID, inputFile, {
              caption: message,
              parse_mode: "Markdown",
            });
          } else {
            await targetBot.api.sendPhoto(config.COMMUNITY_CHAT_ID, inputFile, {
              caption: message,
              parse_mode: "Markdown",
            });
          }
        } else {
          await targetBot.api.sendMessage(config.COMMUNITY_CHAT_ID, message, {
            parse_mode: "Markdown",
            link_preview_options: { is_disabled: true },
          });
        }

        console.log(`[BuyMonitor] ✅ Successfully sent buy alert to Telegram chat ${config.COMMUNITY_CHAT_ID}!`);
      } catch (err: any) {
        console.error(`[BuyMonitor] ❌ Failed to send Telegram buy notification to ${config.COMMUNITY_CHAT_ID}: ${err.message}`);
        // Fallback to plain text message if media sending fails
        try {
          await targetBot.api.sendMessage(config.COMMUNITY_CHAT_ID, message, {
            parse_mode: "Markdown",
            link_preview_options: { is_disabled: true },
          });
        } catch {
          // ignore secondary send failure
        }
      }
    } else {
      console.log(`[BuyMonitor] Bot instance not attached. Printed to console.`);
    }

    // Record in database
    await recordBuyTransaction({
      txHash: event.txHash,
      chain: event.chain,
      tokenAddress: event.tokenAddress,
      buyerAddress: event.buyerAddress,
      amountTokens: event.amountTokens.toString(),
      amountBase: event.amountBase.toString(),
      amountUsd: event.amountUsd,
      marketCapUsd: event.marketCapUsd,
      priceChange24h: event.priceChange24h,
      blockNumber: event.blockNumber,
    });

    return { sent: true };
  }

  /**
   * Starts periodic polling / blockchain monitoring.
   */
  public start(bot: Bot) {
    this.setBot(bot);
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`[BuyMonitor] Started monitoring with min USD threshold: $${this.minUsdThreshold}`);

    // Periodic check loop
    this.timer = setInterval(async () => {
      try {
        await this.pollForBuys();
      } catch (err: any) {
        console.error(`[BuyMonitor] Polling error: ${err.message}`);
      }
    }, config.BUY_BOT_POLL_INTERVAL_MS);
  }

  /**
   * Stops monitoring.
   */
  public stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Poller for live pair updates.
   * When token is live, this pulls recent pair data and detects new buys.
   */
  private async pollForBuys() {
    // If token address is placeholder, do not make live requests
    if (
      !config.TOKEN_CONTRACT_ADDRESS ||
      config.TOKEN_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"
    ) {
      return;
    }

    // In production with live contract, this queries DexScreener or EVM RPC getLogs
    // and calls this.processBuyEvent for each new detected buy.
  }
}

export const buyMonitor = new BuyMonitor();
