import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ── Request schemas + DTOs (validated by the global ZodValidationPipe) ──────────────────────────

/** Create accepts only `name` — `slug` is server-generated (nanoid) and never client-set. */
export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(255),
});
export class CreateWorkspaceDto extends createZodDto(createWorkspaceSchema) {}
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

/** Update accepts only `name` (slug is immutable). */
export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(255),
});
export class UpdateWorkspaceDto extends createZodDto(updateWorkspaceSchema) {}
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

/** List query: sortable + paginated, with sensible defaults (coerced from query strings). */
export const listWorkspacesQuerySchema = z.object({
  sort: z.enum(['name', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export class ListWorkspacesQueryDto extends createZodDto(listWorkspacesQuerySchema) {}
export type ListWorkspacesQuery = z.infer<typeof listWorkspacesQuerySchema>;

// ── Response schemas + DTOs (serialized by @ZodSerializerDto + the global interceptor) ──────────

/** Wire shape returned to clients. `role` is the caller's membership role in this workspace. */
export const workspaceSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'member']),
  createdAt: z.string(),
});
export class WorkspaceDto extends createZodDto(workspaceSchema) {}
export type WorkspaceResponse = z.infer<typeof workspaceSchema>;
export type WorkspaceRole = WorkspaceResponse['role'];

export const workspaceListSchema = z.object({
  items: z.array(workspaceSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export class WorkspaceListDto extends createZodDto(workspaceListSchema) {}
export type WorkspaceListResponse = z.infer<typeof workspaceListSchema>;

/** Map a workspace row + the caller's role to the wire shape. */
export function toWorkspaceDto(
  row: { id: string; slug: string; name: string; createdAt: Date },
  role: WorkspaceRole,
): WorkspaceResponse {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    role,
    createdAt: row.createdAt.toISOString(),
  };
}
