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

const tokenSchema = z
  .object({
    token: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    grant_type: z.string().optional(),
  })
  .refine((data) => Boolean(data.token || data.code), {
    message: "Either token or code is required",
    path: ["token"],
  });

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type TokenRequest = z.infer<typeof tokenSchema>;

export { loginSchema, registerSchema, tokenSchema };
