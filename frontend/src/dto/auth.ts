import { z } from "zod";

export const LoginRequest = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const RegisterRequest = z.object({
  email: z.string().min(1),
  password: z.string().min(6),
});

export const TokenResponse = z.object({
  access_token: z.string(),
  token_type: z.string(),
});

export const UserResponse = z.object({
  id: z.string().uuid(),
  email: z.string(),
  locale: z.string().default("en"),
  created_at: z.string(),
});

export type LoginRequest = z.infer<typeof LoginRequest>;
export type RegisterRequest = z.infer<typeof RegisterRequest>;
export type TokenResponse = z.infer<typeof TokenResponse>;
export type UserResponse = z.infer<typeof UserResponse>;
