import { createServer } from "node:http";
import { ExpressApplication } from "./app.js";
import { DataBaseConnector } from "./config/database/db-connect.js";
import { env } from "./config/env.js";
import { logger } from "./config/log/logger.js";

async function main() {
  try {
    const dbConnector = DataBaseConnector.getInstance();
    await dbConnector.connect();
    const app = new ExpressApplication();
    const httpServer = createServer(app.getApp());
    httpServer.listen(env.port, () => {
      logger.info(`Server is running on port ${env.port}`);
    });
  } catch (error) {
    logger.error("Error starting server:", error);
    process.exit(1);
  }
}

main();
