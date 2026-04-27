import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import jose from "node-jose";
import { env } from "../config/env.js";
import { ApiError } from "../config/error/api-error.js";
import { redisClient } from "../config/redis.js";
import type { OAuthRepository } from "../repository/oauth.repository.js";
import { hashUtils } from "../utils/password.js";
import type { LoginRequest, RegisterRequest } from "../validator/oauth.validator.js";

class OAuthService {
  private readonly oauthRepository: OAuthRepository;
  constructor(oauthRepository: OAuthRepository) {
    this.oauthRepository = oauthRepository;
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

  async authenticateUser(data: LoginRequest) {
    const user = await this.oauthRepository.authenticateUser(data.email);
    if (!user) {
      throw ApiError.notFound("User does not exists");
    }
    const password = user.hashPassword;
    const isCorrectPassword = await hashUtils.comparePassword(data.password, password);
    if (!isCorrectPassword) {
      throw ApiError.unauthorized("Invalid credentials");
    }
    const userObject = user.toObject();
    const token = crypto.randomBytes(12).toString("hex");

    await redisClient.set(
      `oauth:token:${token}`,
      JSON.stringify({
        id: userObject._id.toString(),
        email: userObject.email,
      }),
      {
        EX: 5 * 50,
      }
    );

    return token;
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

  async exchangeToken(token: string) {
    const userDataFromRedis = await redisClient.get(`oauth:token:${token}`);
    const user = JSON.parse(userDataFromRedis ?? "{}");
    if (!user.id) {
      throw ApiError.unauthorized("Invalid token");
    }
    const userData = await this.oauthRepository.getUserById(user.id);
    if (!userData) {
      throw ApiError.notFound("User not found");
    }

    const idToken = await this.createIdToken(userData);
    const accessToken = await this.createAccessToken(userData);
    await redisClient.del(`oauth:token:${token}`);

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
