import express, { type Router } from "express";
import { OAuthController } from "../../controllers/oauth.controller.js";
import { OAuthRepository } from "../../repository/oauth.repository.js";
import { OAuthService } from "../../services/oauth.service.js";

const oauthRepository = new OAuthRepository();
const oauthService = new OAuthService(oauthRepository);
const oauthController = new OAuthController(oauthService);

const oauthRouter: Router = express.Router();

oauthRouter.get(
  "/.well-known/openid-configuration",
  oauthController.getServiceDiscoveryEndpoints.bind(oauthController)
);

oauthRouter.get("/certs", oauthController.getPublicKeys.bind(oauthController));

oauthRouter.get("/authorize", oauthController.renderAuthorizationPage.bind(oauthController));
oauthRouter.post("/authorize", oauthController.handleAuthorization.bind(oauthController));
oauthRouter.post("/login", oauthController.handleAuthorization.bind(oauthController));
oauthRouter.post("/signup", oauthController.handleRegistration.bind(oauthController));
oauthRouter.post("/token", oauthController.handleTokenExchange.bind(oauthController));

export { oauthRouter };
