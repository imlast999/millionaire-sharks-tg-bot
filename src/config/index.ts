import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configSchema = z.object({
  // Telegram
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
  COMMUNITY_CHAT_ID: z.string().default("-1001234567890"),
  ADMIN_USER_IDS: z
    .string()
    .default("")
    .transform((val) =>
      val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => BigInt(s))
    ),

  // Database
  DATABASE_URL: z.string().default("file:./data/millionaire_sharks.db"),

  // Buy Bot
  BUY_BOT_MIN_USD: z.coerce.number().default(10),
  BUY_BOT_POLL_INTERVAL_MS: z.coerce.number().default(10000),
  BUY_MEDIA_DIR: z.string().default("./data/media"),

  // Token & Blockchain
  TOKEN_NAME: z.string().default("Millionaire Sharks"),
  TOKEN_SYMBOL: z.string().default("MSC"),
  TOKEN_CONTRACT_ADDRESS: z.string().default("0x0000000000000000000000000000000000000000"),
  DEX_PAIR_ADDRESS: z.string().default("0x0000000000000000000000000000000000000000"),
  TOKEN_DECIMALS: z.coerce.number().default(18),
  CHAIN_ID: z.coerce.number().default(4663),
  CHAIN_NAME: z.string().default("Robinhood"),
  CHAIN_RPC_URL: z.string().default("https://rpc.mainnet.chain.robinhood.com"),
  CHAIN_EXPLORER_URL: z.string().default("https://robinhoodchain.blockscout.com"),

  // Links
  DEX_CHART_URL: z.string().default("https://dexscreener.com/robinhood"),
  DEX_TRADE_URL: z.string().default("https://robinhood.com/crypto"),
  OFFICIAL_WEBSITE: z.string().default("https://millionairesharks.com"),
  OFFICIAL_X: z.string().default("https://x.com/MillionaireSharks"),

  // Feature Flags
  FEATURE_BUY_BOT: z
    .string()
    .default("true")
    .transform((v) => v.toLowerCase() === "true"),
  FEATURE_WELCOME_BOT: z
    .string()
    .default("true")
    .transform((v) => v.toLowerCase() === "true"),
  FEATURE_DAILY_SHARK: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),
  FEATURE_CASINO: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),
  FEATURE_LEADERBOARD: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),
  FEATURE_GIVEAWAYS: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),

  // Game rules
  DAILY_MIN_POINTS: z.coerce.number().default(50),
  DAILY_MAX_POINTS: z.coerce.number().default(1000),
  CASINO_MIN_WAGER: z.coerce.number().default(10),
  CASINO_MAX_WAGER: z.coerce.number().default(50000),
});

export type Config = z.infer<typeof configSchema>;

export const config = configSchema.parse(process.env);

// Millionaire Sharks Brand Theme Constants
export const BRAND = {
  NAME: "Millionaire Sharks",
  CLUB: "Millionaire Sharks Syndicate",
  EMOJIS: {
    SHARK: "🦈",
    GOLD: "🪙",
    DIAMOND: "💎",
    FIRE: "🔥",
    CROWN: "👑",
    TROPHY: "🏆",
    DICE: "🎲",
    CHIPS: "🎰",
    GIFT: "🎁",
    CHART_UP: "📈",
    MONEY_BAG: "💰",
    LOCK: "🔒",
    VERIFIED: "✅",
    WARNING: "⚠️",
  },
} as const;
