import { Bot, Context } from "grammy";
import { featureManager } from "../../features/featureManager.js";
import { FEATURE_KEYS } from "../../features/types.js";
import crypto from "node:crypto";

export const WELCOME_MESSAGES = [
  "🦈 Welcome to the Millionaire Sharks club, {name}! Grab your gold cocktail.",
  "👑 Glad to have you here, {name}! Another Shark joins the inner syndicate.",
  "🌊 Another Shark joins the syndicate waters. Welcome aboard, {name}!",
  "💎 Welcome aboard, {name}. The ocean is getting richer by the minute.",
  "🪙 A new Shark has entered the Millionaire Sharks ecosystem: {name}.",
  "🥂 Welcome to the family, {name}. We hunt together in deep waters.",
  "🔥 The syndicate grows stronger today. Welcome to the club, {name}!",
  "🛥️ Welcome to the deep end of luxury, {name}. May your bags be heavy and your trades sharp.",
  "🦈 Another Shark has entered the waters: {name}. Let's make waves.",
  "✨ Welcome to Millionaire Sharks, {name}. Stay sharp, swim fast, and feast well.",
  "🍸 Welcome to the high-roller lounge of Millionaire Sharks, {name}!",
  "💰 A new power player has joined the syndicate. Welcome, {name}!",
];

export const GOODBYE_MESSAGES = [
  "👋 One Shark has left the waters. Fair winds on your journey, {name}.",
  "🌊 The syndicate is one Shark lighter. Farewell, {name}.",
  "🦈 Another Shark swims away into the deep blue. Goodbye, {name}.",
  "🪙 The ocean will remember your presence, {name}. Until next time.",
  "⚓ Until we meet again in richer waters, {name}. Stay safe.",
];

export const BAN_MESSAGES = [
  "🚨 The Shark has been permanently removed from the syndicate waters: {name}.",
  "🛑 Security has escorted a member out of the private club: {name}.",
  "🌊 The waters are secure. The syndicate rules are non-negotiable.",
  "⚖️ The syndicate has made its decision. Access revoked for {name}.",
  "🔒 Club privileges have been terminated for {name}. Only true Sharks swim here.",
];

export function pickRandomMessage(pool: string[], name: string): string {
  const index = crypto.randomInt(0, pool.length);
  const template = pool[index];
  return template.replace(/{name}/g, name);
}

export function getRandomWelcomeMessage(name: string): string {
  return pickRandomMessage(WELCOME_MESSAGES, name);
}

export function getRandomGoodbyeMessage(name: string): string {
  return pickRandomMessage(GOODBYE_MESSAGES, name);
}

export function getRandomBanMessage(name: string): string {
  return pickRandomMessage(BAN_MESSAGES, name);
}

/**
 * Escapes markdown characters for safe Telegram display.
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

export function registerWelcomeGoodbyeHandlers(bot: Bot) {
  // Listen for chat_member updates (modern Telegram API standard for join/leave/ban)
  bot.on("chat_member", async (ctx: Context) => {
    const isEnabled = await featureManager.isEnabled(FEATURE_KEYS.WELCOME_BOT);
    if (!isEnabled) return;

    const update = ctx.chatMember;
    if (!update) return;

    const oldStatus = update.old_chat_member.status;
    const newStatus = update.new_chat_member.status;
    const user = update.new_chat_member.user;

    // Do not welcome or announce bots
    if (user.is_bot) return;

    const displayName = user.first_name || user.username || "Shark";
    const safeName = `*${displayName}*`;

    try {
      // 1. New member joined
      if (
        (oldStatus === "left" || oldStatus === "kicked") &&
        (newStatus === "member" || newStatus === "restricted")
      ) {
        const msg = pickRandomMessage(WELCOME_MESSAGES, safeName);
        await ctx.reply(msg, { parse_mode: "Markdown" });
        return;
      }

      // 2. Member banned or kicked
      if (newStatus === "kicked") {
        const msg = pickRandomMessage(BAN_MESSAGES, safeName);
        await ctx.reply(msg, { parse_mode: "Markdown" });
        return;
      }

      // 3. Member left voluntarily
      if (oldStatus === "member" && newStatus === "left") {
        const msg = pickRandomMessage(GOODBYE_MESSAGES, safeName);
        await ctx.reply(msg, { parse_mode: "Markdown" });
        return;
      }
    } catch (err: any) {
      console.warn(`[WelcomeGoodbye] Could not send notification: ${err.message}`);
    }
  });

  // Fallback for new_chat_members message event (for groups with legacy privacy mode)
  bot.on(":new_chat_members", async (ctx: Context) => {
    const isEnabled = await featureManager.isEnabled(FEATURE_KEYS.WELCOME_BOT);
    if (!isEnabled) return;

    const newMembers = ctx.message?.new_chat_members;
    if (!newMembers || newMembers.length === 0) return;

    for (const member of newMembers) {
      if (member.is_bot) continue;
      const displayName = member.first_name || member.username || "Shark";
      const msg = pickRandomMessage(WELCOME_MESSAGES, `*${displayName}*`);
      try {
        await ctx.reply(msg, { parse_mode: "Markdown" });
      } catch (err: any) {
        console.warn(`[WelcomeGoodbye] Legacy welcome send failed: ${err.message}`);
      }
    }
  });

  // Fallback for left_chat_member message event
  bot.on(":left_chat_member", async (ctx: Context) => {
    const isEnabled = await featureManager.isEnabled(FEATURE_KEYS.WELCOME_BOT);
    if (!isEnabled) return;

    const leftMember = ctx.message?.left_chat_member;
    if (!leftMember || leftMember.is_bot) return;

    const displayName = leftMember.first_name || leftMember.username || "Shark";
    const msg = pickRandomMessage(GOODBYE_MESSAGES, `*${displayName}*`);
    try {
      await ctx.reply(msg, { parse_mode: "Markdown" });
    } catch (err: any) {
      console.warn(`[WelcomeGoodbye] Legacy goodbye send failed: ${err.message}`);
    }
  });
}
