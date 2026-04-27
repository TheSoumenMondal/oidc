import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import jose from "node-jose";
import { env } from "../config/env.js";
import { ApiError } from "../config/error/api-error.js";
import type { OAuthService } from "../services/oauth.service.js";
import { loginSchema, registerSchema, tokenSchema } from "../validator/oauth.validator.js";

class OAuthController {
  private readonly oauthService: OAuthService;
  constructor(oauthService: OAuthService) {
    this.oauthService = oauthService;
  }

  /**
   * @description Returns the service discovery endpoints for the OAuth 2.0 implementation
   * @param _req Request instance (not used in this method)
   * @param res  Response instance to send the service discovery endpoints as JSON response
   * @return void
   */
  getServiceDiscoveryEndpoints(_req: Request, res: Response) {
    const issuer = env.serverUrl;
    const response = {
      issuer,
      authorization_endpoint: `${issuer}/api/v1/oauth/authorize`,
      token_endpoint: `${issuer}/api/v1/oauth/token`,
      userinfo_endpoint: `${issuer}/api/v1/oauth/userinfo`,
      jwks_uri: `${issuer}/api/v1/oauth/certs`,
    };
    res.json(response);
  }

  async getPublicKeys(_req: Request, res: Response) {
    const keys = await fs.readFile(path.join(path.resolve("certs"), "public.key"), "utf-8");
    const jwksKeys = await jose.JWK.asKey(keys, "pem");
    res.json(jwksKeys.toJSON());
  }

  renderAuthorizationPage(_req: Request, res: Response) {
    res.sendFile(path.join(path.resolve("public"), "auth.html"));
  }

  async handleAuthorization(req: Request, res: Response) {
    const data = req.body;
    const result = await loginSchema.safeParseAsync(data);
    if (!result.success) {
      throw ApiError.zodError(result.error);
    }
    const token = await this.oauthService.authenticateUser(result.data);
    res.json({ token });
  }

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

  async handleTokenExchange(req: Request, res: Response) {
    const data = req.body;
    const result = await tokenSchema.safeParseAsync(data);
    if (!result.success) {
      throw ApiError.zodError(result.error);
    }

    const exchangeToken = result.data.token ?? result.data.code;
    if (!exchangeToken) {
      throw ApiError.badRequest("Either token or code is required");
    }

    if (result.data.grant_type && result.data.grant_type !== "authorization_code") {
      throw ApiError.badRequest("Unsupported grant_type");
    }

    const tokenResponse = await this.oauthService.exchangeToken(exchangeToken);
    res.json(tokenResponse);
  }

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
