import {
  FEATURE_KEYS,
  FeatureKey,
  FeatureState,
  FEATURE_METADATA,
} from "./types.js";
import {
  isFeatureEnabled,
  setFeatureEnabled,
  enableAllFeatures,
  getAllFeatureFlags,
  initFeatureFlags,
} from "../db/services/featureFlagService.js";
import { prisma } from "../db/client.js";

export class FeatureManager {
  private static instance: FeatureManager;

  private constructor() {}

  public static getInstance(): FeatureManager {
    if (!FeatureManager.instance) {
      FeatureManager.instance = new FeatureManager();
    }
    return FeatureManager.instance;
  }

  /**
   * Initializes the feature flag system.
   */
  public async initialize(): Promise<void> {
    await initFeatureFlags();
  }

  /**
   * Checks if a feature is enabled.
   */
  public async isEnabled(key: FeatureKey): Promise<boolean> {
    return isFeatureEnabled(key);
  }

  /**
   * Enables or disables a feature.
   */
  public async setEnabled(key: FeatureKey, enabled: boolean): Promise<void> {
    await setFeatureEnabled(key, enabled);
  }

  /**
   * Returns states for all features.
   */
  public async getAllStates(): Promise<FeatureState[]> {
    const flags = await getAllFeatureFlags();
    return Object.values(FEATURE_KEYS).map((key) => ({
      key,
      enabled: !!flags[key],
      name: FEATURE_METADATA[key].name,
      description: FEATURE_METADATA[key].description,
    }));
  }

  /**
   * Pre-activation sanity validation:
   * Verifies database connection, essential tables, and readiness before activating features.
   */
  public async validateReadiness(): Promise<{ ok: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Test DB connection
      await prisma.$queryRaw`SELECT 1`;
    } catch (err: any) {
      errors.push(`Database connection failed: ${err.message}`);
      return { ok: false, errors };
    }

    try {
      // Check user table
      await prisma.user.count();
      // Check casino table
      await prisma.casinoGame.count();
      // Check giveaway table
      await prisma.giveaway.count();
      // Check buy tx table
      await prisma.buyTransaction.count();
    } catch (err: any) {
      errors.push(`Database schema verification failed: ${err.message}`);
    }

    return {
      ok: errors.length === 0,
      errors,
    };
  }

  /**
   * Activates all features at once with pre-flight readiness checks.
   */
  public async activateAllFeatures(): Promise<{ success: boolean; errors?: string[]; states: FeatureState[] }> {
    const check = await this.validateReadiness();
    if (!check.ok) {
      return {
        success: false,
        errors: check.errors,
        states: await this.getAllStates(),
      };
    }

    await enableAllFeatures();
    const states = await this.getAllStates();
    return {
      success: true,
      states,
    };
  }
}

export const featureManager = FeatureManager.getInstance();
