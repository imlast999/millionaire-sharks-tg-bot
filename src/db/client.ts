import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

// Ensure sqlite database directory exists if using file storage
const dbUrl = process.env.DATABASE_URL || "file:./data/millionaire_sharks.db";
if (dbUrl.startsWith("file:")) {
  const relativePath = dbUrl.replace("file:", "");
  const absoluteDir = path.dirname(path.resolve(process.cwd(), relativePath));
  if (!fs.existsSync(absoluteDir)) {
    fs.mkdirSync(absoluteDir, { recursive: true });
  }
}

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

// Graceful disconnection helper
export async function disconnectDb() {
  await prisma.$disconnect();
}
