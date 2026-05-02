import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import jose from "node-jose";
import { env } from "../config/env.js";
import { ApiError } from "../config/error/api-error.js";
import type { OAuthService } from "../services/oauth.service.js";
import {
  authorizeQuerySchema,
  loginSchema,
  registerSchema,
  tokenSchema,
} from "../validator/oauth.validator.js";

class OAuthController {
  private readonly oauthService: OAuthService;
  constructor(oauthService: OAuthService) {
    this.oauthService = oauthService;
  }

  /**
   * @description Returns the service discovery endpoints for the OAuth 2.0 implementation
   */
  getServiceDiscoveryEndpoints(_req: Request, res: Response) {
    const issuer = env.serverUrl;
    const response = {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/certs`,
    };
    res.json(response);
  }

  async getPublicKeys(_req: Request, res: Response) {
    const keys = await fs.readFile(path.join(path.resolve("certs"), "public.key"), "utf-8");
    const jwksKeys = await jose.JWK.asKey(keys, "pem");
    res.json(jwksKeys.toJSON());
  }

  /**
   * GET /authorize
   * Validates client_id and redirect_uri from query params, then serves the auth page.
   */
  async renderAuthorizationPage(req: Request, res: Response) {
    const result = await authorizeQuerySchema.safeParseAsync(req.query);
    if (!result.success) {
      throw ApiError.zodError(result.error);
    }

    // Validate client exists and redirect_uri matches
    const clientContext = await this.oauthService.validateAuthorizeRequest(result.data);

    // Serve auth page — query params will be read by client-side JS
    // We pass client info as data attributes for the page to render
    const authPagePath = path.join(path.resolve("public"), "auth.html");
    let html = await fs.readFile(authPagePath, "utf-8");

    // Inject client context into the page so JS can read it
    const contextScript = `<script>
      window.__OAUTH_CONTEXT__ = ${JSON.stringify({
        clientId: clientContext.clientId,
        appName: clientContext.appName,
        redirectUri: clientContext.redirectUri,
        state: clientContext.state,
        scope: clientContext.scope,
      })};
    </script>`;
    html = html.replace("</head>", `${contextScript}\n</head>`);

    res.type("html").send(html);
  }

  /**
   * POST /authorize (login during authorization flow)
   * Authenticates the user and redirects back to the client with an authorization code.
   */
  async handleAuthorization(req: Request, res: Response) {
    const data = req.body;
    const result = await loginSchema.safeParseAsync(data);
    if (!result.success) {
      throw ApiError.zodError(result.error);
    }

    // Extract client context from the request body
    const { client_id, redirect_uri, state, scope } = data;
    if (!(client_id && redirect_uri && state)) {
      throw ApiError.badRequest("Missing client_id, redirect_uri, or state in request body");
    }

    const redirectUrl = await this.oauthService.authenticateUser(result.data, {
      clientId: client_id,
      redirectUri: redirect_uri,
      state,
      scope: scope || "openid",
    });

    res.json({ redirect_url: redirectUrl });
  }

  /**
   * POST /signup (registration during authorization flow)
   */
  async handleRegistration(req: Request, res: Response) {
    const data = req.body;
    const result = await registerSchema.safeParseAsync(data);
    if (!result.success) {
      throw ApiError.zodError(result.error);
    }

    const user = await this.oauthService.registerUser(result.data);
    const userObject = user.toObject();

    res.status(201).json({
      id: userObject._id,
      firstName: userObject.firstName,
      lastName: userObject.lastName,
      email: userObject.email,
      profilePicture: userObject.profilePicture,
    });
  }

  /**
   * POST /token
   * Exchanges an authorization code for tokens. Requires client_id + client_secret.
   */
  async handleTokenExchange(req: Request, res: Response) {
    const data = req.body;
    const result = await tokenSchema.safeParseAsync(data);
    if (!result.success) {
      throw ApiError.zodError(result.error);
    }

    const tokenResponse = await this.oauthService.exchangeToken(result.data);
    res.json(tokenResponse);
  }

  /**
   * GET /userinfo
   * Returns user info for a valid access token.
   */
  async getUserInfo(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Missing or invalid Authorization header");
    }
    const accessToken = authHeader.slice("Bearer ".length).trim();
    if (!accessToken) {
      throw ApiError.unauthorized("Missing or invalid Authorization header");
    }
    const userInfo = await this.oauthService.getUserInfo(accessToken);
    res.json(userInfo);
  }
}

export { OAuthController };
