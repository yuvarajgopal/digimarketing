import { z } from "zod";
import { Platform, CampaignStatus, BudgetType } from "@prisma/client";

export const createCampaignSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(255),
  platform: z.nativeEnum(Platform),
  objective: z.string().optional(),
  budget: z.number().positive().optional(),
  budgetType: z.nativeEnum(BudgetType).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  targeting: z.record(z.string(), z.unknown()).optional(),
  creatives: z.record(z.string(), z.unknown()).optional(),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  objective: z.string().optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  budget: z.number().positive().optional(),
  budgetType: z.nativeEnum(BudgetType).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  targeting: z.record(z.string(), z.unknown()).optional(),
  creatives: z.record(z.string(), z.unknown()).optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
