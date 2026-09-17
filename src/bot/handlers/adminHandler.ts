import { Bot, Context } from "grammy";
import { adminGuard } from "../middleware/auth.js";
import { featureManager } from "../../features/featureManager.js";
import { FEATURE_KEYS, FeatureKey } from "../../features/types.js";
import { buyMonitor } from "../../services/blockchain/buyMonitor.js";
import { updateSharkPoints } from "../../db/services/userService.js";
import { createAuditLog } from "../../db/services/auditService.js";
import { prisma } from "../../db/client.js";

export function registerAdminHandlers(bot: Bot) {
  // Command: /admin
  bot.command("admin", adminGuard, async (ctx: Context) => {
    const text = ctx.message?.text || "";
    const args = text.split(/\s+/).slice(1);
    const subCommand = args[0]?.toLowerCase();

    // 1. /admin flags
    if (subCommand === "flags") {
      const states = await featureManager.getAllStates();
      const list = states
        .map((s) => `${s.enabled ? "✅" : "❌"} *\`${s.key}\`*: ${s.enabled ? "ACTIVE" : "DISABLED"}`)
        .join("\n");

      await ctx.reply(
        `🛡️ *FEATURE FLAGS STATUS*\n\n${list}\n\n` +
          `• Toggle flag: \`/admin toggle <key>\`\n` +
          `• Activate ALL: \`/admin activate_all\``,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // 2. /admin toggle <key>
    if (subCommand === "toggle") {
      const key = args[1]?.toLowerCase() as FeatureKey;
      const validKeys = Object.values(FEATURE_KEYS) as string[];

      if (!key || !validKeys.includes(key)) {
        await ctx.reply(`⚠️ Invalid key. Valid keys:\n${validKeys.map((k) => `\`${k}\``).join(", ")}`, {
          parse_mode: "Markdown",
        });
        return;
      }

      const currentState = await featureManager.isEnabled(key);
      const newState = !currentState;
      await featureManager.setEnabled(key, newState);

      await createAuditLog("FEATURE_TOGGLED", BigInt(ctx.from!.id), { key, enabled: newState });

      await ctx.reply(
        `✅ *Feature Updated*: \`${key}\` is now *${newState ? "ENABLED 🟢" : "DISABLED 🔴"}*`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // 3. /admin activate_all (ONE-SIGNAL ACTIVATION)
    if (subCommand === "activate_all") {
      const result = await featureManager.activateAllFeatures();
      if (!result.success) {
        await ctx.reply(
          `❌ *Activation Failed Pre-flight Checks:*\n${result.errors?.join("\n")}`,
          { parse_mode: "Markdown" }
        );
        return;
      }

      await createAuditLog("ALL_FEATURES_ACTIVATED", BigInt(ctx.from!.id), {
        timestamp: new Date().toISOString(),
      });

      const summary = result.states
        .map((s) => `✅ *\`${s.key}\`*: ACTIVE`)
        .join("\n");

      await ctx.reply(
        `🦈 *ALL INTEGRATIONS ACTIVATED SUCCESSFULLY!*\n\n` +
          `All community features are now live and fully accessible:\n${summary}`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // 4. /admin threshold <amount>
    if (subCommand === "threshold") {
      const amount = parseFloat(args[1]);
      if (isNaN(amount) || amount <= 0) {
        await ctx.reply("⚠️ Usage: `/admin threshold <USD_AMOUNT>` (e.g. `/admin threshold 25`)", {
          parse_mode: "Markdown",
        });
        return;
      }

      buyMonitor.setMinUsdThreshold(amount);
      await createAuditLog("THRESHOLD_UPDATED", BigInt(ctx.from!.id), { minUsd: amount });

      await ctx.reply(`✅ *Buy Bot Threshold Updated*: Minimum purchase alert is now *$${amount.toFixed(2)} USD*.`, {
        parse_mode: "Markdown",
      });
      return;
    }

    // 5. /admin points <telegramId> <amount>
    if (subCommand === "points") {
      const targetId = args[1];
      const amount = parseInt(args[2], 10);

      if (!targetId || isNaN(amount)) {
        await ctx.reply("⚠️ Usage: `/admin points <TelegramUserId> <Amount>` (e.g. `/admin points 123456789 500`)", {
          parse_mode: "Markdown",
        });
        return;
      }

      try {
        const { newBalance } = await updateSharkPoints(
          BigInt(targetId),
          BigInt(amount),
          "ADMIN_ADJUST",
          { description: `Admin adjustment by ${ctx.from!.id}` }
        );

        await createAuditLog("POINTS_ADJUSTED", BigInt(ctx.from!.id), { targetId, amount });

        await ctx.reply(
          `✅ Adjusted points for user \`${targetId}\` by *${amount > 0 ? "+" : ""}${amount} SP*. New balance: \`${newBalance.toString()} SP\``,
          { parse_mode: "Markdown" }
        );
      } catch (err: any) {
        await ctx.reply(`❌ Failed to adjust points: ${err.message}`);
      }
      return;
    }

    // 6. /admin stats
    if (subCommand === "stats") {
      const [usersCount, txCount, casinoCount, giveawayCount, buyCount] = await Promise.all([
        prisma.user.count(),
        prisma.pointTransaction.count(),
        prisma.casinoGame.count(),
        prisma.giveaway.count(),
        prisma.buyTransaction.count(),
      ]);

      await ctx.reply(
        `📊 *MILLIONAIRE SHARKS BOT STATISTICS*\n\n` +
          `👥 *Registered Users:* \`${usersCount}\`\n` +
          `🪙 *Point Transactions:* \`${txCount}\`\n` +
          `🎰 *Casino Games Played:* \`${casinoCount}\`\n` +
          `🎁 *Total Giveaways:* \`${giveawayCount}\`\n` +
          `🦈 *Buys Notified:* \`${buyCount}\`\n` +
          `⚡ *Current Min Buy Threshold:* \`$${buyMonitor.getMinUsdThreshold()} USD\``,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Default Admin Menu
    const states = await featureManager.getAllStates();
    const activeCount = states.filter((s) => s.enabled).length;

    await ctx.reply(
      `🦈 *MILLIONAIRE SHARKS EXECUTIVE ADMIN DASHBOARD*\n\n` +
        `⚙️ *Active Features:* ${activeCount}/${states.length}\n` +
        `💵 *Buy Bot Threshold:* $${buyMonitor.getMinUsdThreshold()} USD\n\n` +
        `*Commands:*\n` +
        `• \`/admin flags\` — View feature flags\n` +
        `• \`/admin toggle <key>\` — Toggle a feature flag\n` +
        `• \`/admin activate_all\` — Activate ALL remaining features\n` +
        `• \`/admin threshold <amount>\` — Set min buy USD alert\n` +
        `• \`/admin points <userId> <amount>\` — Adjust user points\n` +
        `• \`/admin stats\` — View ecosystem stats\n` +
        `• \`/giveaway create ...\` — Create a community giveaway`,
      { parse_mode: "Markdown" }
    );
  });
}
