import z from "zod";

export const validateCreateClientRequest = z.object({
  appName: z.string().min(2).max(100),
  appUrl: z.url(),
  redirectUrl: z.url(),
});

export type CreateClientRequest = z.infer<typeof validateCreateClientRequest>;
