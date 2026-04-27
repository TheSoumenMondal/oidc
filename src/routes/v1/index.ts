import express, { type Router } from "express";
import { oauthRouter } from "./oauth.routes.js";

const v1Router: Router = express.Router();

v1Router.use("/oauth", oauthRouter);

export { v1Router };
