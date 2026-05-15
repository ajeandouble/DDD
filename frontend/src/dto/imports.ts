import { z } from "zod";

export const ImportJobCreateRequest = z.object({
  conversation_id: z.string().uuid(),
  filename: z.string().min(1),
  content_type: z.string().min(1),
});

export const ImportJobResponse = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  filename: z.string(),
  content_type: z.string(),
  status: z.enum(["pending", "uploading", "uploaded", "failed"]),
  storage_key: z.string().nullable(),
  created_at: z.string(),
  failed_reason: z.string().nullable(),
});

export type ImportJobCreateRequest = z.infer<typeof ImportJobCreateRequest>;
export type ImportJobResponse = z.infer<typeof ImportJobResponse>;
