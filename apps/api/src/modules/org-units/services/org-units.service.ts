import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Database, and, asc, eq, ilike, schema, sql } from '@repo/db';
import { firstValueFrom } from 'rxjs';
import type { AppConfigDto } from 'src/common/dtos/app-config.dto';
import { InjectDb } from 'src/modules/database/decorators/inject-database.decorator';

type OrgUnitType = 'org' | 'ministry' | 'division' | 'branch' | 'team';

const ALLOWED_CHILD_TYPES: Record<OrgUnitType, OrgUnitType[]> = {
  org: ['ministry', 'division', 'branch', 'team'],
  ministry: ['division', 'team'],
  division: ['branch', 'team'],
  branch: ['team'],
  team: [],
};

interface PublicBody {
  id: string;
  name: string;
  publicBodyType: { code: string };
  retirementDate: string | null;
}

@Injectable()
export class OrgUnitsService {
  private readonly logger = new Logger(OrgUnitsService.name);

  constructor(
    @InjectDb()
    private readonly db: Database,
    private readonly configService: ConfigService<AppConfigDto, true>,
    private readonly httpService: HttpService,
  ) {}

  async findAll(
    page: number,
    limit: number,
    user: { userId: string; isGlobalAdmin: boolean; search?: string },
  ) {
    const offset = (page - 1) * limit;

    const accessFilter = user.isGlobalAdmin
      ? undefined
      : sql`${schema.orgUnits.id} IN (
          SELECT ${schema.orgUnitMembers.orgUnitId} FROM ${schema.orgUnitMembers}
          WHERE ${schema.orgUnitMembers.userId} = ${user.userId}
          UNION
          SELECT ${schema.orgUnitRelations.descendantId} FROM ${schema.orgUnitRelations}
          INNER JOIN ${schema.orgUnitMembers}
            ON ${schema.orgUnitMembers.orgUnitId} = ${schema.orgUnitRelations.ancestorId}
          WHERE ${schema.orgUnitMembers.userId} = ${user.userId}
        )`;

    const searchFilter = user.search
      ? ilike(schema.orgUnits.name, `%${user.search}%`)
      : undefined;

    const whereClause = and(accessFilter, searchFilter);

    const [docs, countResult] = await Promise.all([
      this.db
        .select()
        .from(schema.orgUnits)
        .where(whereClause)
        .orderBy(asc(schema.orgUnits.name))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.orgUnits)
        .where(whereClause),
    ]);

    const totalDocs = countResult[0].count;
    const totalPages = Math.ceil(totalDocs / limit);

    return { docs, totalDocs, totalPages, page, limit };
  }

  async findById(id: string) {
    const results = await this.db
      .select()
      .from(schema.orgUnits)
      .where(eq(schema.orgUnits.id, id))
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException(`Org unit ${id} not found`);
    }

    return results[0];
  }

  async getMembers(orgUnitId: string) {
    return this.db
      .select({
        userId: schema.orgUnitMembers.userId,
        role: schema.orgUnitMembers.role,
        name: schema.users.name,
        email: schema.users.email,
        createdAt: schema.orgUnitMembers.createdAt,
      })
      .from(schema.orgUnitMembers)
      .innerJoin(
        schema.users,
        eq(schema.orgUnitMembers.userId, schema.users.id),
      )
      .where(eq(schema.orgUnitMembers.orgUnitId, orgUnitId));
  }

  async addMemberById(
    orgUnitId: string,
    userId: string,
    role: 'admin' | 'member',
  ) {
    const [orgUnit, userResults] = await Promise.all([
      this.findById(orgUnitId),
      this.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1),
    ]);

    if (!orgUnit) {
      throw new NotFoundException(`Org unit ${orgUnitId} not found`);
    }

    if (userResults.length === 0) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    try {
      await this.db.insert(schema.orgUnitMembers).values({
        orgUnitId,
        userId,
        role,
      });
    } catch (error) {
      if (
        (error instanceof Error && error.message.includes('unique')) ||
        (error instanceof Error && error.message.includes('duplicate'))
      ) {
        throw new ConflictException(
          'User is already a member of this org unit',
        );
      }
      throw error;
    }

    return { orgUnitId, userId, role };
  }

  async removeMember(orgUnitId: string, userId: string) {
    const result = await this.db
      .delete(schema.orgUnitMembers)
      .where(
        and(
          eq(schema.orgUnitMembers.orgUnitId, orgUnitId),
          eq(schema.orgUnitMembers.userId, userId),
        ),
      )
      .returning({ orgUnitId: schema.orgUnitMembers.orgUnitId });

    if (result.length === 0) {
      throw new NotFoundException('Member not found in this org unit');
    }

    return { removed: true };
  }

  async getChildren(parentId: string) {
    return this.db
      .select({
        id: schema.orgUnits.id,
        name: schema.orgUnits.name,
        type: schema.orgUnits.type,
        createdAt: schema.orgUnits.createdAt,
        updatedAt: schema.orgUnits.updatedAt,
      })
      .from(schema.orgUnitRelations)
      .innerJoin(
        schema.orgUnits,
        eq(schema.orgUnitRelations.descendantId, schema.orgUnits.id),
      )
      .where(
        and(
          eq(schema.orgUnitRelations.ancestorId, parentId),
          eq(schema.orgUnitRelations.depth, 1),
        ),
      )
      .orderBy(asc(schema.orgUnits.name));
  }

  async getAllowedChildTypes(parentId: string) {
    const parent = await this.findById(parentId);
    return ALLOWED_CHILD_TYPES[parent.type as OrgUnitType] ?? [];
  }

  async createChild(parentId: string, name: string, type: OrgUnitType) {
    const parent = await this.findById(parentId);
    const allowed = ALLOWED_CHILD_TYPES[parent.type as OrgUnitType] ?? [];

    if (!allowed.includes(type)) {
      throw new BadRequestException(
        `Cannot create ${type} under ${parent.type}. Allowed types: ${allowed.join(', ') || 'none'}`,
      );
    }

    const [child] = await this.db
      .insert(schema.orgUnits)
      .values({ name, type })
      .returning();

    // Insert closure table entries: all ancestors of the parent + the parent itself
    const ancestorRows = await this.db
      .select({
        ancestorId: schema.orgUnitRelations.ancestorId,
        depth: schema.orgUnitRelations.depth,
      })
      .from(schema.orgUnitRelations)
      .where(eq(schema.orgUnitRelations.descendantId, parentId));

    const closureEntries = [
      // Direct parent → child at depth 1
      { ancestorId: parentId, descendantId: child.id, depth: 1 },
      // All ancestors of parent → child at depth + 1
      ...ancestorRows.map((row) => ({
        ancestorId: row.ancestorId,
        descendantId: child.id,
        depth: row.depth + 1,
      })),
    ];

    if (closureEntries.length > 0) {
      await this.db.insert(schema.orgUnitRelations).values(closureEntries);
    }

    return child;
  }

  async isAncestorAdmin(orgUnitId: string, userId: string): Promise<boolean> {
    // Check if user is admin of any ancestor of this org unit
    const result = await this.db
      .select({ role: schema.orgUnitMembers.role })
      .from(schema.orgUnitRelations)
      .innerJoin(
        schema.orgUnitMembers,
        and(
          eq(
            schema.orgUnitRelations.ancestorId,
            schema.orgUnitMembers.orgUnitId,
          ),
          eq(schema.orgUnitMembers.userId, userId),
          eq(schema.orgUnitMembers.role, 'admin'),
        ),
      )
      .where(eq(schema.orgUnitRelations.descendantId, orgUnitId))
      .limit(1);

    return result.length > 0;
  }

  async syncMinistries() {
    const apiUrl = this.configService.get('PUBLIC_BODIES_API_URL');
    const { data } = await firstValueFrom(
      this.httpService.get<{ payload: PublicBody[] }>(apiUrl),
    );

    const ministries = data.payload.filter(
      (body) =>
        body.publicBodyType.code === 'BC Government Ministry' &&
        body.retirementDate === null,
    );

    let synced = 0;

    for (const ministry of ministries) {
      await this.db
        .insert(schema.orgUnits)
        .values({
          id: ministry.id,
          name: ministry.name,
          type: 'ministry',
        })
        .onConflictDoUpdate({
          target: schema.orgUnits.id,
          set: { name: ministry.name },
        });
      synced++;
    }

    this.logger.log(`Synced ${synced} ministries from Public Bodies API`);
    return { synced };
  }
}
