// config/redis.js

import { createClient } from "redis";

export async function initializeRedis() {
  try {
    const redisClient = createClient({
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
      url: process.env.REDIS_URL
    });

    redisClient.on("error", (err) => console.error("[Redis] Error:", err));
    redisClient.on("connect", () => console.log("[Redis] Connected"));

    await redisClient.connect();

    console.log("[Redis] Successfully initialized");

    return redisClient;
  } catch (error) {
    console.error("[Redis] Initialization failed:", error);
    throw error;
  }
}
