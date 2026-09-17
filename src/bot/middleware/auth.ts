import { Context, NextFunction } from "grammy";
import { config } from "../../config/index.js";

/**
 * Checks if the caller is an authorized admin using their Telegram User ID.
 */
export function isAdmin(userId?: number | bigint): boolean {
  if (!userId) return false;
  const idBigInt = BigInt(userId);
  return config.ADMIN_USER_IDS.some((adminId) => adminId === idBigInt);
}

/**
 * Middleware that restricts a command or handler exclusively to administrators.
 */
export async function adminGuard(ctx: Context, next: NextFunction): Promise<void> {
  const fromId = ctx.from?.id;
  if (!fromId || !isAdmin(fromId)) {
    // Silently ignore or send subtle rejection
    if (ctx.chat?.type === "private") {
      await ctx.reply("🔒 *Access Denied*: This command requires syndicate executive privileges.", {
        parse_mode: "Markdown",
      });
    }
    return;
  }
  await next();
}
