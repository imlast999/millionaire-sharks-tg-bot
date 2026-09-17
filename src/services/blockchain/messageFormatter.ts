import { BuyEvent } from "./types.js";
import { config } from "../../config/index.js";

/**
 * Generates an engaging fire & shark visual scale based on the USD purchase value.
 */
function getIntensityEmojis(amountUsd: number): string {
  if (amountUsd >= 5000) {
    return "💎💎💎 🦈🦈🦈 👑👑👑\n🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥";
  } else if (amountUsd >= 1000) {
    return "💎💎 🦈🦈 👑👑\n🔥🔥🔥🔥🔥🔥🔥🔥";
  } else if (amountUsd >= 500) {
    return "🦈🦈🦈 🔥🔥🔥🔥🔥🔥";
  } else if (amountUsd >= 100) {
    return "🔥🔥🔥🔥🔥 🦈🦈";
  } else if (amountUsd >= 50) {
    return "🔥🔥🔥🔥";
  } else {
    return "🔥🔥🔥";
  }
}

/**
 * Formats numbers with readable comma separators.
 */
function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formats a BuyEvent into a Millionaire Sharks brand Telegram notification message.
 */
export function formatBuyMessage(event: BuyEvent): string {
  const tokenSymbol = event.tokenSymbol || config.TOKEN_SYMBOL;
  const baseSymbol = event.baseSymbol || "ETH";
  const intensity = getIntensityEmojis(event.amountUsd);

  // Formatting values
  const formattedUsd = formatNumber(event.amountUsd, 2);
  const formattedBase = formatNumber(event.amountBase, 4);
  const formattedTokens = formatNumber(event.amountTokens, 2);

  // Market Cap
  const marketCapText = event.marketCapUsd
    ? `Market Cap: $${formatNumber(event.marketCapUsd, 2)}`
    : `Market Cap: $0.00`;

  // 24h Change
  const change = event.priceChange24h ?? 0;
  const changeEmoji = change >= 0 ? "📈" : "📉";
  const changeSign = change >= 0 ? "+" : "";
  const changeText = `24h Change: ${changeEmoji} ${changeSign}${formatNumber(change, 2)}%`;

  // Links
  const txUrl = `${config.CHAIN_EXPLORER_URL.replace(/\/$/, "")}/tx/${event.txHash}`;
  const chartUrl = config.DEX_CHART_URL;
  const tradeUrl = config.DEX_TRADE_URL;
  const websiteUrl = config.OFFICIAL_WEBSITE;
  const xUrl = config.OFFICIAL_X;

  const buyerShort = `${event.buyerAddress.slice(0, 6)}...${event.buyerAddress.slice(-4)}`;

  return `🦈 *${tokenSymbol} | New Buy*\n` +
    `${intensity}\n\n` +
    `🔥 *${formattedBase} ${baseSymbol}* ($${formattedUsd}) ➜ *${formattedTokens} ${tokenSymbol}*\n` +
    `👤 Buyer: \`${buyerShort}\`\n` +
    `💰 ${marketCapText}\n` +
    `${changeText}\n\n` +
    `🔍 [TX](${txUrl}) • 📈 [Chart](${chartUrl}) • 💱 [Trade](${tradeUrl})\n` +
    `Join Community: [Website](${websiteUrl}) • [X](${xUrl})`;
}
