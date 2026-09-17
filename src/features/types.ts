export const FEATURE_KEYS = {
  BUY_BOT: "buy_bot",
  WELCOME_BOT: "welcome_bot",
  DAILY_SHARK: "daily_shark",
  CASINO: "casino",
  LEADERBOARD: "leaderboard",
  GIVEAWAYS: "giveaways",
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

export interface FeatureState {
  key: FeatureKey;
  enabled: boolean;
  name: string;
  description: string;
}

export const FEATURE_METADATA: Record<FeatureKey, { name: string; description: string; dayOne: boolean }> = {
  [FEATURE_KEYS.BUY_BOT]: {
    name: "Buy Bot",
    description: "Real-time token purchase notifications with USD conversion & rich branding",
    dayOne: true,
  },
  [FEATURE_KEYS.WELCOME_BOT]: {
    name: "Welcome & Goodbye Bot",
    description: "Automated community greeting, departure and moderation messages",
    dayOne: true,
  },
  [FEATURE_KEYS.DAILY_SHARK]: {
    name: "Daily Shark Points",
    description: "24-hour daily reward system awarding Shark Points (50 - 1,000 SP)",
    dayOne: false,
  },
  [FEATURE_KEYS.CASINO]: {
    name: "Shark Points Casino",
    description: "Virtual casino games (Dice, Coin Flip, interactive Blackjack) using Shark Points",
    dayOne: false,
  },
  [FEATURE_KEYS.LEADERBOARD]: {
    name: "Shark Points Leaderboard",
    description: "Top community members ranking and personal /rank status",
    dayOne: false,
  },
  [FEATURE_KEYS.GIVEAWAYS]: {
    name: "Telegram Giveaways",
    description: "Interactive button-based giveaways with point eligibility and random draws",
    dayOne: false,
  },
};
