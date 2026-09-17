import { prisma } from "../client.js";
import { FEATURE_KEYS, FeatureKey, FEATURE_METADATA } from "../../features/types.js";
import { config } from "../../config/index.js";

// In-memory cache for fast hot-path lookups
const flagCache: Map<string, boolean> = new Map();

/**
 * Initializes feature flags in the database if not already present.
 * Uses environment variable defaults for initial values (Day One defaults: buy_bot=true, welcome_bot=true, others=false).
 */
export async function initFeatureFlags(): Promise<void> {
  const initialFlags: Record<FeatureKey, boolean> = {
    [FEATURE_KEYS.BUY_BOT]: config.FEATURE_BUY_BOT,
    [FEATURE_KEYS.WELCOME_BOT]: config.FEATURE_WELCOME_BOT,
    [FEATURE_KEYS.DAILY_SHARK]: config.FEATURE_DAILY_SHARK,
    [FEATURE_KEYS.CASINO]: config.FEATURE_CASINO,
    [FEATURE_KEYS.LEADERBOARD]: config.FEATURE_LEADERBOARD,
    [FEATURE_KEYS.GIVEAWAYS]: config.FEATURE_GIVEAWAYS,
  };

  for (const [key, defaultVal] of Object.entries(initialFlags)) {
    const existing = await prisma.featureFlag.findUnique({ where: { key } });
    if (!existing) {
      await prisma.featureFlag.create({
        data: {
          key,
          enabled: defaultVal,
          description: FEATURE_METADATA[key as FeatureKey]?.description || "",
        },
      });
      flagCache.set(key, defaultVal);
    } else {
      flagCache.set(key, existing.enabled);
    }
  }
}

/**
 * Checks whether a feature is currently enabled.
 * Returns cached value if present, otherwise queries database.
 */
export async function isFeatureEnabled(key: FeatureKey): Promise<boolean> {
  if (flagCache.has(key)) {
    return flagCache.get(key)!;
  }
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  const enabled = flag ? flag.enabled : false;
  flagCache.set(key, enabled);
  return enabled;
}

/**
 * Updates the enabled state of a specific feature flag.
 */
export async function setFeatureEnabled(key: FeatureKey, enabled: boolean): Promise<void> {
  await prisma.featureFlag.upsert({
    where: { key },
    update: { enabled },
    create: {
      key,
      enabled,
      description: FEATURE_METADATA[key]?.description || "",
    },
  });
  flagCache.set(key, enabled);
}

/**
 * Activates ALL features at once (Phase 2 activation signal).
 */
export async function enableAllFeatures(): Promise<Record<FeatureKey, boolean>> {
  const allKeys = Object.values(FEATURE_KEYS);
  for (const key of allKeys) {
    await setFeatureEnabled(key, true);
  }
  return getAllFeatureFlags();
}

/**
 * Retrieves the state of all feature flags.
 */
export async function getAllFeatureFlags(): Promise<Record<FeatureKey, boolean>> {
  const flags = await prisma.featureFlag.findMany();
  const result: Record<string, boolean> = {};
  for (const flag of flags) {
    result[flag.key] = flag.enabled;
    flagCache.set(flag.key, flag.enabled);
  }
  // Ensure all keys are represented
  for (const key of Object.values(FEATURE_KEYS)) {
    if (result[key] === undefined) {
      result[key] = false;
    }
  }
  return result as Record<FeatureKey, boolean>;
}
