import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { type Database, users, workspaceMembers, workspaces } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, arrayOverlaps, asc, desc, eq, ilike, isNull, notInArray, or, sql } from 'drizzle-orm';
import {
  type AddMemberInput,
  type AddableStaffQuery,
  type CreateWorkspaceInput,
  type ListWorkspacesQuery,
  type StaffUserResponse,
  type TransferOwnershipInput,
  type UpdateMemberInput,
  type UpdateWorkspaceInput,
  type WorkspaceListResponse,
  type WorkspaceMemberResponse,
  type WorkspaceResponse,
  type WorkspaceRole,
  toStaffUserDto,
  toWorkspaceDto,
  toWorkspaceMemberDto,
} from '../dtos/workspace.dtos';

const workspaceCols = {
  id: workspaces.id,
  slug: workspaces.slug,
  name: workspaces.name,
  ownerUserId: workspaces.ownerUserId,
  createdAt: workspaces.createdAt,
};

@Injectable()
export class WorkspacesService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** Workspaces the caller is a member of, sorted + paginated, with the total membership count. */
  async list(userId: string, query: ListWorkspacesQuery): Promise<WorkspaceListResponse> {
    const sortColumn = query.sort === 'name' ? workspaces.name : workspaces.createdAt;
    const direction = query.order === 'asc' ? asc : desc;
    const rows = await this.db
      .select({ ...workspaceCols, role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId))
      .orderBy(direction(sortColumn))
      .limit(query.limit)
      .offset(query.offset);
    const totals = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, userId));
    return {
      items: rows.map((row) => toWorkspaceDto(row, row.role)),
      total: totals[0]?.count ?? 0,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async get(userId: string, id: string): Promise<WorkspaceResponse> {
    const { workspace, role } = await this.requireMembership(userId, id);
    return toWorkspaceDto(workspace, role);
  }

  /** List a workspace's members (any member may view). Admins first, then by display name. */
  async listMembers(userId: string, id: string): Promise<{ items: WorkspaceMemberResponse[] }> {
    const { workspace } = await this.requireMembership(userId, id);
    const rows = await this.db
      .select({
        id: workspaceMembers.id,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        status: workspaceMembers.status,
        displayName: users.displayName,
        email: users.email,
        createdAt: workspaceMembers.createdAt,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(and(eq(workspaceMembers.workspaceId, id), isNull(users.deletedAt)))
      .orderBy(asc(sql`${workspaceMembers.role} <> 'admin'`), asc(users.displayName));
    return { items: rows.map((row) => toWorkspaceMemberDto(row, workspace.ownerUserId)) };
  }

  /** Staff users who can be added to the workspace (admin only): platform-audience users
   * (`roles` overlaps {staff,admin}), not soft-deleted, NOT already a member, matched by name/email.
   * Capped at 20, name-ordered. Empty `q` returns the first page. */
  async listAddableStaff(
    userId: string,
    workspaceId: string,
    query: AddableStaffQuery,
  ): Promise<{ items: StaffUserResponse[] }> {
    await this.requireAdmin(userId, workspaceId);
    const memberIds = this.db
      .select({ id: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    const conditions = [
      arrayOverlaps(users.roles, ['staff', 'admin']),
      isNull(users.deletedAt),
      notInArray(users.id, memberIds),
    ];
    const q = query.q?.trim();
    if (q) {
      const search = or(ilike(users.displayName, `%${q}%`), ilike(users.email, `%${q}%`));
      if (search) {
        conditions.push(search);
      }
    }
    const rows = await this.db
      .select({ id: users.id, displayName: users.displayName, email: users.email })
      .from(users)
      .where(and(...conditions))
      .orderBy(asc(users.displayName))
      .limit(20);
    return { items: rows.map(toStaffUserDto) };
  }

  /** Add an existing staff user as a member with a chosen role (admin only). Re-validates the
   * target is an eligible staff user (422) and isn't already a member (409). */
  async addMember(
    userId: string,
    workspaceId: string,
    dto: AddMemberInput,
  ): Promise<WorkspaceMemberResponse> {
    const { workspace } = await this.requireAdmin(userId, workspaceId);
    const targetRows = await this.db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        roles: users.roles,
      })
      .from(users)
      .where(and(eq(users.id, dto.userId), isNull(users.deletedAt)))
      .limit(1);
    const target = targetRows[0];
    const isStaff =
      target !== undefined && target.roles.some((r) => r === 'staff' || r === 'admin');
    if (target === undefined || !isStaff) {
      throw new UnprocessableEntityException('User is not an addable staff member');
    }
    const existing = await this.db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.userId, dto.userId), eq(workspaceMembers.workspaceId, workspaceId)),
      )
      .limit(1);
    if (existing[0] !== undefined) {
      throw new ConflictException('User is already a member');
    }
    let inserted;
    try {
      inserted = await this.db
        .insert(workspaceMembers)
        .values({ userId: dto.userId, workspaceId, role: dto.role })
        .returning({
          id: workspaceMembers.id,
          userId: workspaceMembers.userId,
          role: workspaceMembers.role,
          status: workspaceMembers.status,
          createdAt: workspaceMembers.createdAt,
        });
    } catch (error) {
      // Unique (user_id, workspace_id) violation — lost a race against a concurrent add.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('User is already a member');
      }
      throw error;
    }
    const row = inserted[0];
    if (row === undefined) {
      throw new Error('member insert returned no row');
    }
    return toWorkspaceMemberDto(
      { ...row, displayName: target.displayName, email: target.email },
      workspace.ownerUserId,
    );
  }

  /** Change a member's role and/or status (admin only). Refuses to leave a workspace with no active
   * admin (demoting/suspending the last one). */
  async updateMember(
    userId: string,
    workspaceId: string,
    memberId: string,
    dto: UpdateMemberInput,
  ): Promise<void> {
    const { workspace } = await this.requireAdmin(userId, workspaceId);
    const rows = await this.db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspaceId)))
      .limit(1);
    const target = rows[0];
    if (target === undefined) {
      throw new NotFoundException('Member not found');
    }
    // The owner's role and status are immutable — for everyone, including the owner themselves.
    if (target.userId === workspace.ownerUserId) {
      throw new ForbiddenException("The owner's role and status cannot be changed");
    }
    const nextRole = dto.role ?? target.role;
    const nextStatus = dto.status ?? target.status;
    // If this member was an active admin and is being demoted or suspended, keep ≥1 active admin.
    const wasActiveAdmin = target.role === 'admin' && target.status === 'active';
    const staysActiveAdmin = nextRole === 'admin' && nextStatus === 'active';
    if (wasActiveAdmin && !staysActiveAdmin) {
      const counts = await this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.role, 'admin'),
            eq(workspaceMembers.status, 'active'),
          ),
        );
      if ((counts[0]?.n ?? 0) <= 1) {
        throw new ConflictException('A workspace must keep at least one active admin');
      }
    }
    await this.db
      .update(workspaceMembers)
      .set({ role: nextRole, status: nextStatus })
      .where(eq(workspaceMembers.id, memberId));
  }

  /** Resolve a workspace by slug for a member; 404 if it doesn't exist or the caller isn't a member. */
  async getBySlug(userId: string, slug: string): Promise<WorkspaceResponse> {
    const rows = await this.db
      .select({ workspace: workspaceCols, role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaceMembers.userId, userId), eq(workspaces.slug, slug)))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new NotFoundException('Workspace not found');
    }
    return toWorkspaceDto(row.workspace, row.role);
  }

  /** Create a workspace and the creator's admin membership atomically. */
  async create(userId: string, dto: CreateWorkspaceInput): Promise<WorkspaceResponse> {
    return this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(workspaces)
        .values({ name: dto.name, ownerUserId: userId })
        .returning(workspaceCols);
      const workspace = inserted[0];
      if (workspace === undefined) {
        throw new Error('workspace insert returned no row');
      }
      await tx
        .insert(workspaceMembers)
        .values({ userId, workspaceId: workspace.id, role: 'admin' });
      return toWorkspaceDto(workspace, 'admin');
    });
  }

  async update(userId: string, id: string, dto: UpdateWorkspaceInput): Promise<WorkspaceResponse> {
    await this.requireAdmin(userId, id);
    const updated = await this.db
      .update(workspaces)
      .set({ name: dto.name })
      .where(eq(workspaces.id, id))
      .returning(workspaceCols);
    const workspace = updated[0];
    if (workspace === undefined) {
      throw new NotFoundException('Workspace not found');
    }
    return toWorkspaceDto(workspace, 'admin');
  }

  /** Hard delete — workspace_members rows cascade away via the FK. */
  async remove(userId: string, id: string): Promise<void> {
    await this.requireAdmin(userId, id);
    await this.db.delete(workspaces).where(eq(workspaces.id, id));
  }

  /** Transfer ownership to another member. Owner-only (403); the new owner must already be an
   * active member (422). In one tx the new owner is promoted to active admin and `owner_user_id`
   * is reassigned; the previous owner keeps their admin membership (no demotion). */
  async transferOwnership(
    userId: string,
    workspaceId: string,
    dto: TransferOwnershipInput,
  ): Promise<WorkspaceResponse> {
    const { workspace } = await this.requireMembership(userId, workspaceId);
    if (workspace.ownerUserId !== userId) {
      throw new ForbiddenException('Only the owner can transfer ownership');
    }
    const targetRows = await this.db
      .select({ id: workspaceMembers.id, status: workspaceMembers.status })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, dto.userId)),
      )
      .limit(1);
    const target = targetRows[0];
    if (target === undefined || target.status !== 'active') {
      throw new UnprocessableEntityException('New owner must be an active member');
    }
    return this.db.transaction(async (tx) => {
      await tx
        .update(workspaceMembers)
        .set({ role: 'admin', status: 'active' })
        .where(eq(workspaceMembers.id, target.id));
      const updated = await tx
        .update(workspaces)
        .set({ ownerUserId: dto.userId })
        .where(eq(workspaces.id, workspaceId))
        .returning(workspaceCols);
      const next = updated[0];
      if (next === undefined) {
        throw new Error('workspace update returned no row');
      }
      // The caller (previous owner) keeps their admin membership.
      return toWorkspaceDto(next, 'admin');
    });
  }

  /** Resolve the caller's membership of a workspace; 404 if they aren't a member. */
  private async requireMembership(
    userId: string,
    workspaceId: string,
  ): Promise<{ workspace: WorkspaceRow; role: WorkspaceRole }> {
    const rows = await this.db
      .select({ workspace: workspaceCols, role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(
        and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)),
      )
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new NotFoundException('Workspace not found');
    }
    return row;
  }

  /** Membership must exist (404) and be admin (403). Returns the membership for reuse. */
  private async requireAdmin(
    userId: string,
    workspaceId: string,
  ): Promise<{ workspace: WorkspaceRow; role: WorkspaceRole }> {
    const membership = await this.requireMembership(userId, workspaceId);
    if (membership.role !== 'admin') {
      throw new ForbiddenException('Admin role required');
    }
    return membership;
  }
}

interface WorkspaceRow {
  id: string;
  slug: string;
  name: string;
  ownerUserId: string;
  createdAt: Date;
}
