import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../utils/redis.js";

/**
 * Rate limiter middleware for authentication routes using Redis store.
 * Limits to 5 requests per 15 minutes window per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skip: () => process.env.NODE_ENV === "test", // Bypass limiter in tests
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  message: {
    status: "fail",
    message: "Terlalu banyak percobaan, coba lagi dalam 15 menit.",
  },
});
