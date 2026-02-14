import { z } from "zod";
import { Platform, PostStatus } from "@prisma/client";

export const createPostSchema = z.object({
  clientId: z.string().cuid(),
  content: z.string().min(1, "Content is required"),
  platforms: z.array(z.nativeEnum(Platform)).min(1, "Select at least one platform"),
  scheduledAt: z.string().datetime().optional(),
  templateId: z.string().cuid().optional(),
  mediaIds: z.array(z.string().cuid()).optional(),
  tags: z.array(z.string()).optional(),
});

export const updatePostSchema = z.object({
  content: z.string().min(1).optional(),
  platforms: z.array(z.nativeEnum(Platform)).min(1).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  status: z.nativeEnum(PostStatus).optional(),
  mediaIds: z.array(z.string().cuid()).optional(),
  tags: z.array(z.string()).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
