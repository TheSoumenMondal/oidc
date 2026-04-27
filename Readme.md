# OAuth2 OIDC Provider

Lightweight OAuth2 + OpenID Connect provider built with Express and TypeScript.
It supports user registration/login, token exchange, user info, OIDC discovery, and JWKS.

## Quick Setup

1. Install dependencies:
```bash
pnpm install
```
2. Start infrastructure (MongoDB + Redis):
```bash
docker compose up -d
```
3. Create environment file:
```bash
cp .env.example .env
```
4. Generate RSA keys for JWT signing:
```bash
pnpm run generate:keys
```
5. Start in development mode:
```bash
pnpm run dev
```

## Environment Variables

Required values in `.env`:

- `NODE_ENV` (`development` | `production` | `test`)
- `PORT` (e.g. `3000`)
- `DB_URI` (MongoDB connection string)
- `LOG_LEVEL` (`fatal` | `error` | `warn` | `info` | `debug` | `trace`)
- `SERVER_URL` (e.g. `http://localhost:3000`)

## Useful Commands

- `pnpm run dev` - Build/watch and run app
- `pnpm run build` - Compile TypeScript
- `pnpm run start` - Run compiled app
- `pnpm run lint` - Run Biome checks
- `pnpm run format` - Format code

## API Endpoints

Base API prefix: `/api/v1/oauth`

The app also mounts OAuth routes at root (`/`) for compatibility, but `/api/v1/oauth` is the recommended base.

- `GET /health` - Service health check
- `GET /api/v1/oauth/.well-known/openid-configuration` - OIDC discovery metadata
- `GET /api/v1/oauth/certs` - JWKS/public key endpoint
- `GET /api/v1/oauth/authorize` - Authorization/login page (`public/auth.html`)
- `POST /api/v1/oauth/authorize` - Authenticate user, returns temporary authorization token
- `POST /api/v1/oauth/login` - Alias of authorize login flow
- `POST /api/v1/oauth/signup` - Register a new user
- `POST /api/v1/oauth/token` - Exchange token/code for `id_token` and `access_token`
- `GET /api/v1/oauth/userinfo` - Get user profile using `Authorization: Bearer <access_token>`

## OAuth Flow (Short)

1. `POST /signup` to create user
2. `POST /authorize` (or `/login`) to get temporary token
3. `POST /token` with `grant_type=authorization_code` and `token` (or `code`)
4. `GET /userinfo` with Bearer access token
