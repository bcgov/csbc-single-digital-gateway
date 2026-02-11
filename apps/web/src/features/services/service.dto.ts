import { z } from "zod";

export const ApplicationDto = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
  apiKey: z.string(),
  formId: z.string(),
  url: z.string().url(),
  blockName: z.string().nullable().optional(),
  blockType: z.string().optional(),
});

export type ApplicationDto = z.infer<typeof ApplicationDto>;

export const ServiceDto = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(255),
  slug: z.string(),
  description: z
    .object({
      short: z.string().optional(),
      long: z.string().optional(),
    })
    .optional(),
  categories: z.array(z.string()).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  applications: z.array(ApplicationDto).optional(),
  settings: z
    .object({
      consent: z
        .array(
          z.object({
            id: z.string(),
            documentId: z.string(),
          }),
        )
        .optional(),
      delegate: z
        .object({
          access: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type ServiceDto = z.infer<typeof ServiceDto>;
