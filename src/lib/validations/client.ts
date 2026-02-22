import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  company: z.string().max(255).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(2).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  businessAccountType: z.enum(["CLIENT_MANAGED", "AGENCY_MANAGED"]).default("AGENCY_MANAGED"),
  createUserAccount: z.boolean().optional(),
  userEmail: z.string().email("Valid email required").optional(),
  userPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
}).refine(
  (data) => {
    if (data.createUserAccount) {
      return !!data.userEmail && !!data.userPassword;
    }
    return true;
  },
  { message: "Email and password are required when creating a user account", path: ["userEmail"] }
);

export const updateClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  company: z.string().max(255).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(2).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  businessAccountType: z.enum(["CLIENT_MANAGED", "AGENCY_MANAGED"]).optional(),
}).partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
