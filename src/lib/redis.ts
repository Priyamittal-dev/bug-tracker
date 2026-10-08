import Redis from "ioredis";
import { logger } from "@/lib/logger";

let redisClient: Redis | null = null;
let isRedisConnected = false;

export function getRedisClient(): Redis | null {
  if (process.env.NODE_ENV === "test") {
    return null; // Use in-memory store in unit test environment
  }

  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop retrying after 3 attempts
        }
        return Math.min(times * 100, 1000);
      },
      lazyConnect: true,
    });

    redisClient.on("connect", () => {
      isRedisConnected = true;
      logger.info("Connected to Redis broker", { event: "REDIS_CONNECTED" });
    });

    redisClient.on("error", (err) => {
      isRedisConnected = false;
      logger.warn(
        "Redis connection unavailable, falling back to resilient in-memory store",
        {
          event: "REDIS_FALLBACK",
          errorCode: (err as any)?.code,
        },
      );
    });

    redisClient.connect().catch((err) => {
      isRedisConnected = false;
      logger.warn(
        "Initial Redis connection failed, continuing with in-memory fallback",
        {
          event: "REDIS_CONNECT_FAIL",
          errorCode: (err as any)?.code,
        },
      );
    });

    return redisClient;
  } catch (error) {
    logger.warn(
      "Failed to initialize Redis client, operating with in-memory fallback",
      {
        event: "REDIS_INIT_ERROR",
      },
    );
    return null;
  }
}

export async function checkRedisHealth(): Promise<{
  status: "connected" | "disconnected" | "fallback";
  latencyMs?: number;
}> {
  const client = getRedisClient();
  if (!client || !isRedisConnected) {
    return { status: "fallback" };
  }

  const start = Date.now();
  try {
    await client.ping();
    return { status: "connected", latencyMs: Date.now() - start };
  } catch {
    return { status: "disconnected" };
  }
}
