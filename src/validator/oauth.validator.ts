import z from "zod";

const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});

const registerSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  password: z.string(),
  profilePicture: z.string().optional(),
});

const authorizeQuerySchema = z.object({
  response_type: z.literal("code"),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  state: z.string().min(1),
  scope: z.string().optional().default("openid"),
});

const tokenSchema = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  redirect_uri: z.string().url(),
});

export type AuthorizeQuery = z.infer<typeof authorizeQuerySchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type TokenRequest = z.infer<typeof tokenSchema>;

export { authorizeQuerySchema, loginSchema, registerSchema, tokenSchema };
