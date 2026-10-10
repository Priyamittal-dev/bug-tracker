import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabaseUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL;

  // If a PostgreSQL / MySQL / CockroachDB URL is configured, use it directly
  if (envUrl && !envUrl.startsWith("file:")) {
    return envUrl;
  }

  // When deployed to Vercel or AWS Lambda, the root filesystem is read-only.
  // SQLite must be located in /tmp to allow read-write access for transactions and locks.
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  if (isServerless) {
    const tmpDir = "/tmp";
    const targetDbPath = path.join(tmpDir, "dev.db");

    try {
      if (!fs.existsSync(targetDbPath) || fs.statSync(targetDbPath).size === 0) {
        // Statically scoped path to bundled SQLite database in prisma/
        const sourceDbPath = path.join(process.cwd(), "prisma", "dev.db");
        if (fs.existsSync(sourceDbPath) && fs.statSync(sourceDbPath).size > 0) {
          fs.copyFileSync(sourceDbPath, targetDbPath);
        } else {
          const fallbackPath = path.join(process.cwd(), "dev.db");
          if (fs.existsSync(fallbackPath) && fs.statSync(fallbackPath).size > 0) {
            fs.copyFileSync(fallbackPath, targetDbPath);
          } else {
            console.warn("[Prisma] Pre-seeded SQLite database not found. Target /tmp/dev.db is empty.");
          }
        }
      }

      return `file:${targetDbPath}`;
    } catch (e) {
      console.error("[Prisma] Error setting up /tmp SQLite database:", e);
    }
  }

  return envUrl;
}

const customUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    customUrl
      ? {
          datasources: {
            db: {
              url: customUrl,
            },
          },
        }
      : undefined
  );

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

