import { Context, NextFunction } from "grammy";
import { FeatureKey } from "../../features/types.js";
import { featureManager } from "../../features/featureManager.js";
import { isAdmin } from "./auth.js";

/**
 * Middleware factory that gates a handler behind a feature flag.
 * If the feature is disabled:
 * - Ordinary users: silently ignored in groups, or politely informed in PM that the feature is coming soon to the syndicate.
 * - Admins: can be informed that the feature flag is currently disabled in configuration.
 */
export function featureGuard(featureKey: FeatureKey) {
  return async (ctx: Context, next: NextFunction): Promise<void> => {
    const isEnabled = await featureManager.isEnabled(featureKey);

    if (!isEnabled) {
      if (isAdmin(ctx.from?.id)) {
        if (ctx.chat?.type === "private") {
          await ctx.reply(
            `⚠️ *Feature Disabled*: \`${featureKey}\` is currently inactive.\n\nUse \`/admin flags\` or \`npm run features:enable-all\` to activate it.`,
            { parse_mode: "Markdown" }
          );
        }
        return;
      }

      // If called in private chat, send luxury teaser
      if (ctx.chat?.type === "private") {
        await ctx.reply(
          `🦈 *Millionaire Sharks Syndicate*\n\nThis VIP feature is being prepared for the syndicate waters following the official token launch. Stay sharp!`,
          { parse_mode: "Markdown" }
        );
      }
      return;
    }

    await next();
  };
}
