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

/** Update a member's role and/or status (admin only). */
export const updateMemberSchema = z
  .object({
    role: z.enum(['admin', 'member']).optional(),
    status: z.enum(['active', 'suspended']).optional(),
  })
  .refine((v) => v.role !== undefined || v.status !== undefined, {
    message: 'Provide role and/or status',
  });
export class UpdateMemberDto extends createZodDto(updateMemberSchema) {}
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

/** Transfer workspace ownership to another member (owner only). */
export const transferOwnershipSchema = z.object({
  userId: z.uuid(),
});
export class TransferOwnershipDto extends createZodDto(transferOwnershipSchema) {}
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;

// ── Response schemas + DTOs (serialized by @ZodSerializerDto + the global interceptor) ──────────

/** Wire shape returned to clients. `role` is the caller's membership role in this workspace. */
export const workspaceSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'member']),
  /** The user id of the workspace owner (creator, or whoever it was transferred to). */
  ownerId: z.string(),
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

/** A workspace member: the membership joined to the user's profile. */
export const workspaceMemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  role: z.enum(['admin', 'member']),
  status: z.enum(['active', 'suspended']),
  displayName: z.string(),
  email: z.string().nullable(),
  /** True when this member is the workspace owner — their role/status cannot be changed. */
  isOwner: z.boolean(),
  joinedAt: z.string(),
});
export class WorkspaceMemberDto extends createZodDto(workspaceMemberSchema) {}
export type WorkspaceMemberResponse = z.infer<typeof workspaceMemberSchema>;

export const workspaceMemberListSchema = z.object({ items: z.array(workspaceMemberSchema) });
export class WorkspaceMemberListDto extends createZodDto(workspaceMemberListSchema) {}

export function toWorkspaceMemberDto(
  row: {
    id: string;
    userId: string;
    role: WorkspaceMemberResponse['role'];
    status: WorkspaceMemberResponse['status'];
    displayName: string;
    email: string | null;
    createdAt: Date;
  },
  ownerId: string,
): WorkspaceMemberResponse {
  return {
    id: row.id,
    userId: row.userId,
    role: row.role,
    status: row.status,
    displayName: row.displayName,
    email: row.email,
    isOwner: row.userId === ownerId,
    joinedAt: row.createdAt.toISOString(),
  };
}

/** Map a workspace row + the caller's role to the wire shape. */
export function toWorkspaceDto(
  row: { id: string; slug: string; name: string; ownerUserId: string; createdAt: Date },
  role: WorkspaceRole,
): WorkspaceResponse {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    role,
    ownerId: row.ownerUserId,
    createdAt: row.createdAt.toISOString(),
  };
}
