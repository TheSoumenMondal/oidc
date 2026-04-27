import mongoose from "mongoose";
import { env } from "../env.js";
import { ApiError } from "../error/api-error.js";
import { logger } from "../log/logger.js";

class DataBaseConnector {
  private static instance: DataBaseConnector;
  private constructor() {}

  public static getInstance(): DataBaseConnector {
    if (!DataBaseConnector.instance) {
      DataBaseConnector.instance = new DataBaseConnector();
    }
    return DataBaseConnector.instance;
  }

  public async connect(): Promise<void> {
    try {
      const uri = env.databaseUri;
      const connection = await mongoose.connect(uri, {
        directConnection: true,
      });
      logger.info(`Connected to database: ${connection.connection.host}`);
      logger.info(`Connected to database: ${connection.connection.name}`);
    } catch (error) {
      logger.error("Database connection error:", error);
      throw ApiError.dbConnectionError();
    }
  }
}

export { DataBaseConnector };
