import { createClient } from "redis";
import "dotenv/config";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

redisClient.on("connect", () => {
  console.log("🔴 Connected to Redis server");
});

// Connect to Redis
redisClient.connect().catch((err) => {
  console.error("Failed to connect to Redis:", err);
});
