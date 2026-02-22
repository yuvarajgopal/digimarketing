import { z } from "zod";
import { Platform, PostStatus } from "@prisma/client";

export const createPostSchema = z.object({
  clientId: z.string().min(1),
  content: z.string().min(1, "Content is required"),
  platforms: z.array(z.nativeEnum(Platform)).optional().default([]),
  connectionIds: z.array(z.string().min(1)).optional(),
  scheduledAt: z.string().datetime().optional(),
  templateId: z.string().min(1).optional(),
  mediaIds: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string()).optional(),
  postType: z.enum(["POST", "REEL", "STORY"]).optional().default("POST"),
}).refine(
  (data) => (data.connectionIds && data.connectionIds.length > 0) || (data.platforms && data.platforms.length > 0),
  { message: "Select at least one platform or connection", path: ["platforms"] }
);

export const updatePostSchema = z.object({
  content: z.string().min(1).optional(),
  platforms: z.array(z.nativeEnum(Platform)).min(1).optional(),
  connectionIds: z.array(z.string().min(1)).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  status: z.nativeEnum(PostStatus).optional(),
  mediaIds: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string()).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
