import express, { type Router } from "express";
import { clientRouter } from "./client.routes.js";
import { oauthRouter } from "./oauth.routes.js";

const v1Router: Router = express.Router();

v1Router.use("/oauth", oauthRouter);
v1Router.use("/clients", clientRouter);

export { v1Router };
