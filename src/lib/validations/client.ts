import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  company: z.string().max(255).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().max(100).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
