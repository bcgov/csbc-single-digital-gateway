import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Database, users, workspaceMembers, workspaces } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  type CreateWorkspaceInput,
  type ListWorkspacesQuery,
  type UpdateMemberInput,
  type UpdateWorkspaceInput,
  type WorkspaceListResponse,
  type WorkspaceMemberResponse,
  type WorkspaceResponse,
  type WorkspaceRole,
  toWorkspaceDto,
  toWorkspaceMemberDto,
} from '../dtos/workspace.dtos';

const workspaceCols = {
  id: workspaces.id,
  slug: workspaces.slug,
  name: workspaces.name,
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
    await this.requireMembership(userId, id);
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
    return { items: rows.map(toWorkspaceMemberDto) };
  }

  /** Change a member's role and/or status (admin only). Refuses to leave a workspace with no active
   * admin (demoting/suspending the last one). */
  async updateMember(
    userId: string,
    workspaceId: string,
    memberId: string,
    dto: UpdateMemberInput,
  ): Promise<void> {
    await this.requireAdmin(userId, workspaceId);
    const rows = await this.db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspaceId)))
      .limit(1);
    const target = rows[0];
    if (target === undefined) {
      throw new NotFoundException('Member not found');
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
        .values({ name: dto.name })
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

  /** Membership must exist (404) and be admin (403). */
  private async requireAdmin(userId: string, workspaceId: string): Promise<void> {
    const { role } = await this.requireMembership(userId, workspaceId);
    if (role !== 'admin') {
      throw new ForbiddenException('Admin role required');
    }
  }
}

interface WorkspaceRow {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
}
