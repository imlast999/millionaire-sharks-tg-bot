import { BotError, Context, GrammyError, HttpError } from "grammy";

export async function globalErrorHandler(err: BotError<Context>): Promise<void> {
  const ctx = err.ctx;
  const e = err.error;

  console.error(`[Telegram Bot Error] In update ${ctx.update.update_id}:`);

  if (e instanceof GrammyError) {
    console.error(`Telegram API Error: ${e.description} (code: ${e.error_code})`);
  } else if (e instanceof HttpError) {
    console.error(`Network HTTP Error contacting Telegram: ${e.message}`);
  } else {
    console.error("Unexpected Bot Handler Error:", e);
  }

  // Gracefully notify user if in private chat
  try {
    if (ctx.chat?.type === "private") {
      await ctx.reply("⚠️ An unexpected error occurred while processing your request. The syndicate IT crew has been notified.");
    }
  } catch {
    // Ignore secondary send failures
  }
}
