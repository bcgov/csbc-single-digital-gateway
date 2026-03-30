import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class PaginationQueryDto extends createZodDto(PaginationQuerySchema) {}

export const OrgUnitIdParamSchema = z.object({
  id: z.string().uuid(),
});

export class OrgUnitIdParamDto extends createZodDto(OrgUnitIdParamSchema) {}

export const MemberRemoveParamSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
});

export class MemberRemoveParamDto extends createZodDto(
  MemberRemoveParamSchema,
) {}

export const SearchUsersQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export class SearchUsersQueryDto extends createZodDto(
  SearchUsersQuerySchema,
) {}

export const AddMemberBodySchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member']),
});

export class AddMemberBodyDto extends createZodDto(AddMemberBodySchema) {}

export const CreateChildOrgUnitBodySchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['division', 'branch', 'team']),
});

export class CreateChildOrgUnitBodyDto extends createZodDto(
  CreateChildOrgUnitBodySchema,
) {}
