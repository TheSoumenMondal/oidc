import express, { type Router } from "express";
import { v1Router } from "./v1/index.js";

const apiRouter: Router = express.Router();

apiRouter.use("/v1", v1Router);

export { apiRouter };
