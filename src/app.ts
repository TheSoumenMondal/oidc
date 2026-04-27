import type { Application } from "express";
import express from "express";
import { errorHandler } from "./config/error/error-handler.js";
import { apiRouter } from "./routes/index.js";
import { oauthRouter } from "./routes/v1/oauth.routes.js";
import { healthRoute } from "./utils/health-route.js";

class ExpressApplication {
  private readonly app: Application;
  constructor() {
    this.app = express();
    this.addMiddleware();
    this.configureHealthRoute();
    this.configureRoutes();
    this.configureErrorHandling();
  }
  /**
   * @description Returns the Express application instance
   * @returns Express App Instance
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * @description Adds middleware to the Express application instance
   * @returns void
   */
  private addMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.text());
    this.app.use(express.static("public"));
  }

  /**
   * @description Adds error handling middleware to the Express application instance
   * @returns void
   */
  private configureErrorHandling(): void {
    this.app.use(errorHandler);
  }
  /**
   * @description Configures the health route for the Express application instance
   * @returns void
   */
  private configureHealthRoute(): void {
    this.app.get("/health", healthRoute("ExpressApplication"));
  }

  private configureRoutes(): void {
    this.app.use("/", oauthRouter);
    this.app.use("/api", apiRouter);
  }
}

export { ExpressApplication };
