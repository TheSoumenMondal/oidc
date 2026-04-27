import dotenv from "dotenv";
import z from "zod";
import { ApiError } from "./error/api-error.js";

dotenv.config();

const runtimeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.coerce.number().int().min(1).max(65535),
  DB_URI: z.string().trim(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),
  SERVER_URL: z.url(),
});

type AppEnv = {
  nodeEnv: z.infer<typeof runtimeEnvSchema>["NODE_ENV"];
  port: z.infer<typeof runtimeEnvSchema>["PORT"];
  databaseUri: z.infer<typeof runtimeEnvSchema>["DB_URI"];
  logLevel: z.infer<typeof runtimeEnvSchema>["LOG_LEVEL"];
  serverUrl: z.infer<typeof runtimeEnvSchema>["SERVER_URL"];
};

function getEnv(): AppEnv {
  const runtimeProcess = Reflect.get(globalThis, "process") as {
    env?: Record<string, string | undefined>;
  };
  const res = runtimeEnvSchema.safeParse(runtimeProcess.env);
  if (!res.success) {
    throw ApiError.zodError(res.error);
  }
  return {
    nodeEnv: res.data.NODE_ENV,
    port: res.data.PORT,
    databaseUri: res.data.DB_URI,
    logLevel: res.data.LOG_LEVEL,
    serverUrl: res.data.SERVER_URL,
  };
}

export const env = Object.freeze(getEnv());
