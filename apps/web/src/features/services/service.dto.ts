import { z } from "zod";

export const ApplicationDto = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  apiKey: z.string(),
  baseUrl: z.string().url(),
});

export type ApplicationDto = z.infer<typeof ApplicationDto>;

export const ServiceDto = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().regex(/^[a-z0-9-]+-[a-f0-9]+$/, "Must be a URL-safe slug with hash suffix"),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()),
  eligibility: z.array(z.string()).optional(),
  applications: z.array(ApplicationDto).optional(),
});

export type ServiceDto = z.infer<typeof ServiceDto>;
