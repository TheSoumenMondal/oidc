import { createClient, type RedisClientType } from "redis";
import { logger } from "./log/logger.js";

const redisClient: RedisClientType = createClient();

redisClient.on("error", (err) => logger.error("Redis Client Error", err));
await redisClient.connect();

export { redisClient };
