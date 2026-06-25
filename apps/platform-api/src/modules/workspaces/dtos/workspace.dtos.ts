import { BadRequestException } from '@nestjs/common';
import type { WorkspaceMember } from '@repo/database';
import { z } from 'zod';

/** Create accepts only `name` — `slug` is server-generated (nanoid) and never client-set. */
export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(255),
});
export type CreateWorkspaceDto = z.infer<typeof createWorkspaceSchema>;

/** Update accepts only `name` (slug is immutable). */
export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(255),
});
export type UpdateWorkspaceDto = z.infer<typeof updateWorkspaceSchema>;

/** List query: sortable + paginated, with sensible defaults (coerced from query strings). */
export const listWorkspacesQuerySchema = z.object({
  sort: z.enum(['name', 'createdAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListWorkspacesQuery = z.infer<typeof listWorkspacesQuerySchema>;

export type WorkspaceRole = WorkspaceMember['role'];

/** Wire shape returned to clients. `role` is the caller's membership role in this workspace. */
export interface WorkspaceDto {
  id: string;
  slug: string;
  name: string;
  role: WorkspaceRole;
  createdAt: string;
}

export interface WorkspaceListDto {
  items: WorkspaceDto[];
  total: number;
  limit: number;
  offset: number;
}

/** Parse with a schema; on failure throw a 400 with a readable message (never a 500/stack). */
export function zodParse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  return result.data;
}

/** Map a workspace row + the caller's role to the wire DTO. */
export function toWorkspaceDto(
  row: { id: string; slug: string; name: string; createdAt: Date },
  role: WorkspaceRole,
): WorkspaceDto {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    role,
    createdAt: row.createdAt.toISOString(),
  };
}
