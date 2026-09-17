import { describe, it, expect, beforeEach } from "vitest";
import { featureManager } from "../src/features/featureManager.js";
import { FEATURE_KEYS } from "../src/features/types.js";

describe("Centralized Feature Flag Engine", () => {
  beforeEach(async () => {
    await featureManager.initialize();
  });

  it("should enable and disable individual features properly", async () => {
    await featureManager.setEnabled(FEATURE_KEYS.CASINO, false);
    expect(await featureManager.isEnabled(FEATURE_KEYS.CASINO)).toBe(false);

    await featureManager.setEnabled(FEATURE_KEYS.CASINO, true);
    expect(await featureManager.isEnabled(FEATURE_KEYS.CASINO)).toBe(true);

    // Revert
    await featureManager.setEnabled(FEATURE_KEYS.CASINO, false);
    expect(await featureManager.isEnabled(FEATURE_KEYS.CASINO)).toBe(false);
  });

  it("should pass readiness pre-flight check when database is healthy", async () => {
    const check = await featureManager.validateReadiness();
    expect(check.ok).toBe(true);
    expect(check.errors.length).toBe(0);
  });

  it("should activate all features on one single signal and retain day one features", async () => {
    const activation = await featureManager.activateAllFeatures();
    expect(activation.success).toBe(true);

    const states = await featureManager.getAllStates();
    for (const state of states) {
      expect(state.enabled).toBe(true);
    }

    // Reset back to Day One defaults
    await featureManager.setEnabled(FEATURE_KEYS.DAILY_SHARK, false);
    await featureManager.setEnabled(FEATURE_KEYS.CASINO, false);
    await featureManager.setEnabled(FEATURE_KEYS.LEADERBOARD, false);
    await featureManager.setEnabled(FEATURE_KEYS.GIVEAWAYS, false);
  });
});
