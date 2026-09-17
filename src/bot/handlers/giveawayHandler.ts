import { Bot, Context, InlineKeyboard } from "grammy";
import { featureGuard } from "../middleware/featureGuard.js";
import { isAdmin } from "../middleware/auth.js";
import { FEATURE_KEYS } from "../../features/types.js";
import { featureManager } from "../../features/featureManager.js";
import { getOrCreateUser } from "../../db/services/userService.js";
import {
  createGiveaway,
  enterGiveaway,
  endGiveaway,
  getParticipantCount,
  getActiveGiveaways,
  getExpiredActiveGiveaways,
  updateGiveawayMessage,
} from "../../db/services/giveawayService.js";

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

export function registerGiveawayHandlers(bot: Bot) {
  // Command: /giveaway
  bot.command("giveaway", featureGuard(FEATURE_KEYS.GIVEAWAYS), async (ctx: Context) => {
    const fromId = ctx.from?.id;
    const isUserAdmin = isAdmin(fromId);

    const text = ctx.message?.text || "";
    const args = text.split(" ").slice(1);
    const subCommand = args[0]?.toLowerCase();

    // If admin wants to create a giveaway: /giveaway create <prize> | <winners> | <minutes> | [minPoints]
    if (subCommand === "create" && isUserAdmin) {
      const rest = text.replace(/^\/giveaway\s+create\s+/i, "");
      const parts = rest.split("|").map((p) => p.trim());

      if (parts.length < 3) {
        await ctx.reply(
          `🎁 *Giveaway Creation Format:*\n\n` +
            `\`/giveaway create <Prize> | <WinnersCount> | <DurationMinutes> | [MinSharkPoints]\`\n\n` +
            `*Example:*\n\`/giveaway create 500 USDT VIP Airdrop | 3 | 60 | 100\``,
          { parse_mode: "Markdown" }
        );
        return;
      }

      const prize = parts[0];
      const winnersCount = parseInt(parts[1], 10) || 1;
      const durationMinutes = parseInt(parts[2], 10) || 60;
      const minPoints = parts[3] ? BigInt(parts[3]) : 0n;

      const endsAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      const giveaway = await createGiveaway({
        title: "Millionaire Sharks Syndicate Giveaway",
        prizeDescription: prize,
        winnersCount,
        minSharkPoints: minPoints,
        endsAt,
        createdBy: BigInt(fromId!),
        chatId: ctx.chat?.id ? BigInt(ctx.chat.id) : undefined,
      });

      const keyboard = new InlineKeyboard().text("🎁 Enter Giveaway", `giveaway_enter:${giveaway.id}`);

      const minPointsText = minPoints > 0n ? `\n🔒 *Requirement:* Must hold at least \`${minPoints.toString()} SP\`` : "";

      const announcement =
        `🎁 *MILLIONAIRE SHARKS EXCLUSIVE GIVEAWAY*\n\n` +
        `🏆 *Prize:* ${prize}\n` +
        `👑 *Winners:* ${winnersCount}\n` +
        `⏳ *Duration:* ${durationMinutes} minutes (ends at ${endsAt.toISOString().slice(11, 16)} UTC)${minPointsText}\n\n` +
        `Click the button below to register your entry with the syndicate!`;

      const sentMsg = await ctx.reply(announcement, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });

      await updateGiveawayMessage(giveaway.id, BigInt(ctx.chat!.id), sentMsg.message_id);
      return;
    }

    // Admin manually ending giveaway: /giveaway end <id>
    if (subCommand === "end" && isUserAdmin) {
      const giveawayId = args[1]?.trim();
      if (!giveawayId) {
        const active = await getActiveGiveaways();
        if (active.length === 0) {
          await ctx.reply("No active giveaways to end.");
          return;
        }
        const list = active.map((g) => `• ID: \`${g.id}\` — Prize: *${g.prizeDescription}*`).join("\n");
        await ctx.reply(`Active Giveaways:\n${list}\n\nEnd with: \`/giveaway end <id>\``, { parse_mode: "Markdown" });
        return;
      }

      try {
        const { giveaway, winners } = await endGiveaway(giveawayId);
        let winnerList = "No eligible participants entered.";
        if (winners.length > 0) {
          winnerList = winners
            .map((w, idx) => {
              const u = w.user;
              const name = u.username ? `@${u.username}` : u.firstName || "Shark";
              return `${idx + 1}. *${escapeMarkdown(name)}*`;
            })
            .join("\n");
        }

        const announcement =
          `🏆 *GIVEAWAY CONCLUDED: WINNERS ANNOUNCED*\n\n` +
          `🎁 *Prize:* ${giveaway.prizeDescription}\n\n` +
          `👑 *Winners:*\n${winnerList}\n\n` +
          `Congratulations to our winners! The syndicate rewards loyalty.`;

        await ctx.reply(announcement, { parse_mode: "Markdown" });
      } catch (err: any) {
        await ctx.reply(`Error closing giveaway: ${err.message}`);
      }
      return;
    }

    // Default view: list active giveaways for community
    const active = await getActiveGiveaways();
    if (active.length === 0) {
      await ctx.reply(
        `🎁 *MILLIONAIRE SHARKS GIVEAWAYS*\n\nThere are no active giveaways at this moment. Stay tuned for executive announcements!`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const list = active
      .map((g) => `• *${escapeMarkdown(g.prizeDescription)}* (${g.winnersCount} winners) — Ends at ${g.endsAt.toISOString().slice(11, 16)} UTC`)
      .join("\n");

    await ctx.reply(`🎁 *ACTIVE GIVEAWAYS*\n\n${list}`, { parse_mode: "Markdown" });
  });

  // Inline button click: giveaway_enter:<giveawayId>
  bot.callbackQuery(/^giveaway_enter:(.+)$/, async (ctx) => {
    const giveawayId = ctx.match[1];
    const from = ctx.from;
    if (!from) return;

    const telegramId = BigInt(from.id);
    const user = await getOrCreateUser({
      telegramId,
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
    });

    const result = await enterGiveaway(giveawayId, user.id, user.sharkPoints);

    if (!result.success) {
      await ctx.answerCallbackQuery({
        text: result.reason || "Entry failed.",
        show_alert: true,
      });
      return;
    }

    const count = await getParticipantCount(giveawayId);

    await ctx.answerCallbackQuery({
      text: `🎉 You are successfully registered for this giveaway! (Total participants: ${count})`,
      show_alert: true,
    });
  });

  // Background auto-resolver for expired giveaways
  setInterval(async () => {
    try {
      const isEnabled = await featureManager.isEnabled(FEATURE_KEYS.GIVEAWAYS);
      if (!isEnabled) return;

      const expired = await getExpiredActiveGiveaways();
      for (const giveaway of expired) {
        const { winners } = await endGiveaway(giveaway.id);

        let winnerList = "No eligible participants entered.";
        if (winners.length > 0) {
          winnerList = winners
            .map((w, idx) => {
              const u = w.user;
              const name = u.username ? `@${u.username}` : u.firstName || "Shark";
              return `${idx + 1}. *${escapeMarkdown(name)}*`;
            })
            .join("\n");
        }

        const announcement =
          `🏆 *GIVEAWAY CONCLUDED: WINNERS ANNOUNCED*\n\n` +
          `🎁 *Prize:* ${giveaway.prizeDescription}\n\n` +
          `👑 *Winners:*\n${winnerList}\n\n` +
          `Congratulations to our winners! The syndicate rewards loyalty.`;

        if (giveaway.chatId) {
          try {
            await bot.api.sendMessage(Number(giveaway.chatId), announcement, {
              parse_mode: "Markdown",
            });
          } catch (err: any) {
            console.warn(`[Giveaway] Could not post auto-close announcement: ${err.message}`);
          }
        }
      }
    } catch (err: any) {
      console.error(`[Giveaway Auto-Close Error]: ${err.message}`);
    }
  }, 30000); // check every 30 seconds
}
