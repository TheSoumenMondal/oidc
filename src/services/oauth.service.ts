import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import jose from "node-jose";
import { env } from "../config/env.js";
import { ApiError } from "../config/error/api-error.js";
import { redisClient } from "../config/redis.js";
import type { ClientRepository } from "../repository/client.repository.js";
import type { OAuthRepository } from "../repository/oauth.repository.js";
import { hashUtils } from "../utils/password.js";
import type {
  AuthorizeQuery,
  LoginRequest,
  RegisterRequest,
  TokenRequest,
} from "../validator/oauth.validator.js";

class OAuthService {
  private readonly oauthRepository: OAuthRepository;
  private readonly clientRepository: ClientRepository;

  constructor(oauthRepository: OAuthRepository, clientRepository: ClientRepository) {
    this.oauthRepository = oauthRepository;
    this.clientRepository = clientRepository;
  }

  private async createIdToken(userData: {
    _id: { toString(): string };
    email: string;
    firstName: string;
    lastName: string;
  }) {
    const privateKey = await jose.JWK.asKey(
      fs.readFileSync(path.join(path.resolve("certs"), "private.key"), "utf-8"),
      "pem"
    );

    const payload = {
      sub: userData._id.toString(),
      email: userData.email,
      name: `${userData.firstName} ${userData.lastName}`.trim(),
      iss: env.serverUrl,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };

    const idToken = await jose.JWS.createSign(
      {
        format: "compact",
        fields: {
          alg: "RS256",
          typ: "JWT",
          ...(privateKey.kid ? { kid: privateKey.kid } : {}),
        },
      },
      privateKey
    )
      .update(JSON.stringify(payload))
      .final();

    return idToken;
  }

  private async createAccessToken(userData: { _id: { toString(): string }; email: string }) {
    const accessToken = crypto.randomBytes(20).toString("hex");
    await redisClient.set(
      `oauth:access_token:${accessToken}`,
      JSON.stringify({
        id: userData._id.toString(),
        email: userData.email,
      }),
      {
        EX: 60 * 60,
      }
    );
    return accessToken;
  }

  /**
   * Validates the authorization request query parameters.
   * Ensures the client_id exists and the redirect_uri matches the registered one.
   */
  async validateAuthorizeRequest(query: AuthorizeQuery) {
    const client = await this.clientRepository.getClientById(query.client_id);
    if (!client) {
      throw ApiError.badRequest("Invalid client_id: client not found");
    }

    const clientObj = client.toObject();
    if (clientObj.redirectUrls !== query.redirect_uri) {
      throw ApiError.badRequest("Invalid redirect_uri: does not match registered redirect URL");
    }

    return {
      clientId: clientObj.clientId,
      appName: clientObj.appName,
      redirectUri: query.redirect_uri,
      state: query.state,
      scope: query.scope,
    };
  }

  /**
   * Authenticates the user and generates an authorization code.
   * Returns the redirect URL with the authorization code and state.
   */
  async authenticateUser(
    data: LoginRequest,
    clientContext: { clientId: string; redirectUri: string; state: string; scope: string }
  ) {
    const user = await this.oauthRepository.authenticateUser(data.email);
    if (!user) {
      throw ApiError.notFound("User does not exist");
    }

    const password = user.hashPassword;
    const isCorrectPassword = await hashUtils.comparePassword(data.password, password);
    if (!isCorrectPassword) {
      throw ApiError.unauthorized("Invalid credentials");
    }

    const userObject = user.toObject();
    const authorizationCode = crypto.randomBytes(16).toString("hex");

    // Store the authorization code in Redis with all context needed for token exchange
    await redisClient.set(
      `oauth:auth_code:${authorizationCode}`,
      JSON.stringify({
        userId: userObject._id.toString(),
        email: userObject.email,
        clientId: clientContext.clientId,
        redirectUri: clientContext.redirectUri,
        scope: clientContext.scope,
      }),
      {
        EX: 5 * 60, // Authorization codes expire in 5 minutes per spec
      }
    );

    // Build redirect URL with code and state
    const redirectUrl = new URL(clientContext.redirectUri);
    redirectUrl.searchParams.set("code", authorizationCode);
    redirectUrl.searchParams.set("state", clientContext.state);

    return redirectUrl.toString();
  }

  async registerUser(data: RegisterRequest) {
    const alreadyExistingUser = await this.oauthRepository.authenticateUser(data.email);
    if (alreadyExistingUser) {
      throw ApiError.conflict("User already exists");
    }

    const hashPassword = await hashUtils.hashPassword(data.password);
    const user = await this.oauthRepository.createUser({
      ...data,
      password: hashPassword,
    });
    return user;
  }

  /**
   * Exchanges an authorization code for tokens.
   * Validates client_id + client_secret and ensures the code is bound to the correct client.
   */
  async exchangeToken(data: TokenRequest) {
    // 1. Validate client credentials
    const client = await this.clientRepository.getClientById(data.client_id);
    if (!client) {
      throw ApiError.unauthorized("Invalid client_id");
    }

    const clientObj = client.toObject();
    if (clientObj.clientSecret !== data.client_secret) {
      throw ApiError.unauthorized("Invalid client_secret");
    }

    // 2. Retrieve and validate the authorization code
    const codeData = await redisClient.get(`oauth:auth_code:${data.code}`);
    if (!codeData) {
      throw ApiError.unauthorized("Invalid or expired authorization code");
    }

    const codePayload = JSON.parse(codeData);

    // 3. Ensure the code was issued to this client and redirect_uri matches
    if (codePayload.clientId !== data.client_id) {
      throw ApiError.unauthorized("Authorization code was not issued to this client");
    }

    if (codePayload.redirectUri !== data.redirect_uri) {
      throw ApiError.unauthorized(
        "redirect_uri does not match the one used in the authorization request"
      );
    }

    // 4. Get user data and generate tokens
    const userData = await this.oauthRepository.getUserById(codePayload.userId);
    if (!userData) {
      throw ApiError.notFound("User not found");
    }

    const idToken = await this.createIdToken(userData);
    const accessToken = await this.createAccessToken(userData);

    // 5. Delete the authorization code (single use)
    await redisClient.del(`oauth:auth_code:${data.code}`);

    return {
      id_token: idToken,
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 60 * 60,
    };
  }

  async getUserInfo(accessToken: string) {
    const userDataFromRedis = await redisClient.get(`oauth:access_token:${accessToken}`);
    const user = JSON.parse(userDataFromRedis ?? "{}");
    if (!user.id) {
      throw ApiError.unauthorized("Invalid access token");
    }
    const userData = await this.oauthRepository.getUserById(user.id);
    if (!userData) {
      throw ApiError.notFound("User not found");
    }
    return userData;
  }
}

export { OAuthService };
