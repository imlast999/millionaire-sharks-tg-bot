import { Bot, Context, InlineKeyboard } from "grammy";
import { featureGuard } from "../middleware/featureGuard.js";
import { FEATURE_KEYS } from "../../features/types.js";
import { config } from "../../config/index.js";
import { getOrCreateUser } from "../../db/services/userService.js";
import {
  startCasinoGame,
  resolveCasinoGame,
  getActiveGame,
} from "../../db/services/casinoService.js";
import { rollDice } from "../../services/casino/diceEngine.js";
import { flipCoin, CoinSide } from "../../services/casino/coinflipEngine.js";
import {
  dealNewGame,
  hit,
  stand,
  formatHand,
  calculateHandValue,
  BlackjackState,
} from "../../services/casino/blackjackEngine.js";

function parseWager(text: string | undefined): bigint | null {
  if (!text) return null;
  try {
    const wagerNum = parseInt(text.trim(), 10);
    if (isNaN(wagerNum) || wagerNum <= 0) return null;
    return BigInt(wagerNum);
  } catch {
    return null;
  }
}

export function registerCasinoHandlers(bot: Bot) {
  // Command: /casino
  bot.command("casino", featureGuard(FEATURE_KEYS.CASINO), async (ctx: Context) => {
    const from = ctx.from;
    if (!from) return;

    const user = await getOrCreateUser({
      telegramId: BigInt(from.id),
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
    });

    const msg =
      `🎰 *MILLIONAIRE SHARKS CASINO LOUNGE*\n` +
      `_High stakes. Exclusive waters. Virtual Shark Points only._\n\n` +
      `💰 *Your Balance:* \`${user.sharkPoints.toString()} SP\`\n` +
      `⚡ *Wager Limits:* \`${config.CASINO_MIN_WAGER}\` - \`${config.CASINO_MAX_WAGER} SP\`\n\n` +
      `🎲 *Available Games:*\n` +
      `• *Dice*: \`/dice <wager>\`\n` +
      `• *Coin Flip*: \`/flip <wager> <heads|tails>\`\n` +
      `• *Blackjack*: \`/blackjack <wager>\`\n\n` +
      `_Note: Shark Points are for in-community entertainment only._`;

    await ctx.reply(msg, { parse_mode: "Markdown" });
  });

  // Command: /dice <wager> [high|low]
  bot.command("dice", featureGuard(FEATURE_KEYS.CASINO), async (ctx: Context) => {
    const from = ctx.from;
    if (!from) return;

    const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
    const wager = parseWager(args[0]);

    if (!wager || wager < BigInt(config.CASINO_MIN_WAGER) || wager > BigInt(config.CASINO_MAX_WAGER)) {
      await ctx.reply(
        `🎲 Usage: \`/dice <wager>\` (Limits: ${config.CASINO_MIN_WAGER} - ${config.CASINO_MAX_WAGER} SP)`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const telegramId = BigInt(from.id);
    const user = await getOrCreateUser({
      telegramId,
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
    });

    if (user.sharkPoints < wager) {
      await ctx.reply(
        `❌ Insufficient Shark Points. Your balance is \`${user.sharkPoints.toString()} SP\`.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    try {
      const game = await startCasinoGame({
        userId: user.id,
        telegramId,
        gameType: "DICE",
        wager,
      });

      const result = rollDice("high");
      const payout = result.isWin ? BigInt(Math.floor(Number(wager) * result.payoutMultiplier)) : 0n;

      await resolveCasinoGame(
        game.id,
        telegramId,
        result.isWin ? "WIN" : "LOSS",
        payout,
        JSON.stringify(result)
      );

      const outcomeMsg = result.isWin
        ? `🎉 *YOU WON!* The die landed on *${result.roll}*!\n💰 *Payout:* \`+${payout.toString()} SP\``
        : `💀 *YOU LOST.* The die landed on *${result.roll}*.\n💸 *Lost:* \`-${wager.toString()} SP\``;

      await ctx.reply(
        `🎲 *SHARK DICE ROLL*\n\n` +
          `Player: *${from.first_name || "Shark"}*\n` +
          `Wager: \`${wager.toString()} SP\`\n\n` +
          `${outcomeMsg}`,
        { parse_mode: "Markdown" }
      );
    } catch (err: any) {
      await ctx.reply(`⚠️ Game error: ${err.message}`);
    }
  });

  // Command: /flip <wager> <heads|tails>
  bot.command("flip", featureGuard(FEATURE_KEYS.CASINO), async (ctx: Context) => {
    const from = ctx.from;
    if (!from) return;

    const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
    const wager = parseWager(args[0]);
    const choice = args[1]?.toLowerCase() as CoinSide;

    if (!wager || !["heads", "tails"].includes(choice)) {
      await ctx.reply(
        `🪙 Usage: \`/flip <wager> <heads|tails>\`\nExample: \`/flip 100 heads\``,
        { parse_mode: "Markdown" }
      );
      return;
    }

    if (wager < BigInt(config.CASINO_MIN_WAGER) || wager > BigInt(config.CASINO_MAX_WAGER)) {
      await ctx.reply(
        `❌ Wager limits: ${config.CASINO_MIN_WAGER} - ${config.CASINO_MAX_WAGER} SP`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const telegramId = BigInt(from.id);
    const user = await getOrCreateUser({
      telegramId,
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
    });

    if (user.sharkPoints < wager) {
      await ctx.reply(
        `❌ Insufficient Shark Points. Your balance is \`${user.sharkPoints.toString()} SP\`.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    try {
      const game = await startCasinoGame({
        userId: user.id,
        telegramId,
        gameType: "COINFLIP",
        wager,
      });

      const result = flipCoin(choice);
      const payout = result.isWin ? BigInt(Math.floor(Number(wager) * result.payoutMultiplier)) : 0n;

      await resolveCasinoGame(
        game.id,
        telegramId,
        result.isWin ? "WIN" : "LOSS",
        payout,
        JSON.stringify(result)
      );

      const outcomeMsg = result.isWin
        ? `🎉 *YOU WON!* The coin landed on *${result.side.toUpperCase()}*!\n💰 *Payout:* \`+${payout.toString()} SP\``
        : `💀 *YOU LOST.* The coin landed on *${result.side.toUpperCase()}*.\n💸 *Lost:* \`-${wager.toString()} SP\``;

      await ctx.reply(
        `🪙 *SHARK GOLD COIN FLIP*\n\n` +
          `Player: *${from.first_name || "Shark"}*\n` +
          `Prediction: *${choice.toUpperCase()}*\n` +
          `Wager: \`${wager.toString()} SP\`\n\n` +
          `${outcomeMsg}`,
        { parse_mode: "Markdown" }
      );
    } catch (err: any) {
      await ctx.reply(`⚠️ Game error: ${err.message}`);
    }
  });

  // Command: /blackjack <wager>
  bot.command("blackjack", featureGuard(FEATURE_KEYS.CASINO), async (ctx: Context) => {
    const from = ctx.from;
    if (!from) return;

    const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
    const wager = parseWager(args[0]);

    if (!wager || wager < BigInt(config.CASINO_MIN_WAGER) || wager > BigInt(config.CASINO_MAX_WAGER)) {
      await ctx.reply(
        `🃏 Usage: \`/blackjack <wager>\` (Limits: ${config.CASINO_MIN_WAGER} - ${config.CASINO_MAX_WAGER} SP)`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const telegramId = BigInt(from.id);
    const user = await getOrCreateUser({
      telegramId,
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
    });

    if (user.sharkPoints < wager) {
      await ctx.reply(
        `❌ Insufficient Shark Points. Your balance is \`${user.sharkPoints.toString()} SP\`.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Check if user already has an active pending game
    const active = await getActiveGame(user.id, "BLACKJACK");
    if (active) {
      await ctx.reply(
        `⚠️ You already have an unfinished Blackjack hand. Please complete it first.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    try {
      const state = dealNewGame(wager);

      const game = await startCasinoGame({
        userId: user.id,
        telegramId,
        gameType: "BLACKJACK",
        wager,
        stateJson: JSON.stringify(state),
      });

      if (state.isGameOver) {
        // Immediate blackjack / push / loss
        const payout = state.payoutMultiplier
          ? BigInt(Math.floor(Number(wager) * state.payoutMultiplier))
          : 0n;

        await resolveCasinoGame(
          game.id,
          telegramId,
          state.outcome as any,
          payout,
          JSON.stringify(state)
        );

        let resultText = "";
        if (state.outcome === "BLACKJACK") {
          resultText = `💎 *NATURAL BLACKJACK!* Payout: \`+${payout.toString()} SP\` (3:2)`;
        } else if (state.outcome === "PUSH") {
          resultText = `🤝 *PUSH!* Both dealer and player have Blackjack. Wager refunded.`;
        } else {
          resultText = `💀 *DEALER BLACKJACK.* You lost \`-${wager.toString()} SP\`.`;
        }

        await ctx.reply(
          `🃏 *BLACKJACK VIP TABLE*\n\n` +
            `👤 *Your Hand:* ${formatHand(state.playerHand)} (${calculateHandValue(state.playerHand).total})\n` +
            `🦈 *Dealer Hand:* ${formatHand(state.dealerHand)} (${calculateHandValue(state.dealerHand).total})\n\n` +
            `${resultText}`,
          { parse_mode: "Markdown" }
        );
        return;
      }

      // Interactive hand
      const keyboard = new InlineKeyboard()
        .text("🃏 Hit", `bj_hit:${game.id}`)
        .text("🛑 Stand", `bj_stand:${game.id}`);

      await ctx.reply(
        `🃏 *BLACKJACK VIP TABLE*\n\n` +
          `👤 *Your Hand:* ${formatHand(state.playerHand)} (${calculateHandValue(state.playerHand).total})\n` +
          `🦈 *Dealer Hand:* ${formatHand(state.dealerHand, true)}\n` +
          `💰 *Wager:* \`${wager.toString()} SP\`\n\n` +
          `Choose your move:`,
        {
          parse_mode: "Markdown",
          reply_markup: keyboard,
        }
      );
    } catch (err: any) {
      await ctx.reply(`⚠️ Blackjack error: ${err.message}`);
    }
  });

  // Callback query: bj_hit:<gameId> and bj_stand:<gameId>
  bot.callbackQuery(/^bj_(hit|stand):(.+)$/, async (ctx) => {
    const action = ctx.match[1];
    const gameId = ctx.match[2];
    const fromId = BigInt(ctx.from.id);

    const user = await getOrCreateUser({
      telegramId: fromId,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
    });

    const active = await getActiveGame(user.id, "BLACKJACK");
    if (!active || active.id !== gameId || !active.stateJson) {
      await ctx.answerCallbackQuery({ text: "This game is no longer active.", show_alert: true });
      return;
    }

    let state: BlackjackState = JSON.parse(active.stateJson);
    const wager = BigInt(state.wager);

    if (action === "hit") {
      state = hit(state);
    } else if (action === "stand") {
      state = stand(state);
    }

    if (state.isGameOver) {
      const payout = state.payoutMultiplier
        ? BigInt(Math.floor(Number(wager) * state.payoutMultiplier))
        : 0n;

      await resolveCasinoGame(
        gameId,
        fromId,
        state.outcome as any,
        payout,
        JSON.stringify(state)
      );

      const playerVal = calculateHandValue(state.playerHand).total;
      const dealerVal = calculateHandValue(state.dealerHand).total;

      let verdict = "";
      if (state.outcome === "WIN") {
        verdict = `🎉 *YOU WIN!* Payout: \`+${payout.toString()} SP\``;
      } else if (state.outcome === "PUSH") {
        verdict = `🤝 *PUSH.* Tie hand. Wager refunded: \`${wager.toString()} SP\``;
      } else {
        verdict = playerVal > 21
          ? `💥 *BUSTED (${playerVal})!* You lost \`-${wager.toString()} SP\``
          : `💀 *DEALER WINS (${dealerVal} vs ${playerVal}).* Lost \`-${wager.toString()} SP\``;
      }

      await ctx.editMessageText(
        `🃏 *BLACKJACK VIP TABLE — FINAL*\n\n` +
          `👤 *Your Hand:* ${formatHand(state.playerHand)} (${playerVal})\n` +
          `🦈 *Dealer Hand:* ${formatHand(state.dealerHand)} (${dealerVal})\n\n` +
          `${verdict}`,
        { parse_mode: "Markdown" }
      );
      await ctx.answerCallbackQuery();
    } else {
      // Game continues (after hit < 21)
      const playerVal = calculateHandValue(state.playerHand).total;
      await resolveCasinoGame(gameId, fromId, "PENDING" as any, 0n, JSON.stringify(state));

      const keyboard = new InlineKeyboard()
        .text("🃏 Hit", `bj_hit:${gameId}`)
        .text("🛑 Stand", `bj_stand:${gameId}`);

      await ctx.editMessageText(
        `🃏 *BLACKJACK VIP TABLE*\n\n` +
          `👤 *Your Hand:* ${formatHand(state.playerHand)} (${playerVal})\n` +
          `🦈 *Dealer Hand:* ${formatHand(state.dealerHand, true)}\n` +
          `💰 *Wager:* \`${wager.toString()} SP\`\n\n` +
          `Choose your move:`,
        {
          parse_mode: "Markdown",
          reply_markup: keyboard,
        }
      );
      await ctx.answerCallbackQuery();
    }
  });
}
