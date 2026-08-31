import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { type Database, documentTypeVersions, documentTypes } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, eq, inArray } from 'drizzle-orm';

/** The `{ schema, uischema }` a renderer needs, as authored on one document type version. */
export interface ServiceTypeDefinition {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
}

const EMPTY_DEFINITION: ServiceTypeDefinition = { schema: {}, uischema: {} };

/** Split a `document_type_versions.definition` JSONB into `{ schema, uischema }`, tolerating nulls. */
function toDefinition(definition: unknown): ServiceTypeDefinition {
  const def = (definition ?? {}) as { schema?: unknown; uischema?: unknown };
  return {
    schema: (def.schema as Record<string, unknown> | undefined) ?? {},
    uischema: (def.uischema as Record<string, unknown> | undefined) ?? {},
  };
}

export interface ResolvedServiceType {
  typeId: string;
  /** The Service type's currently-published version — new document versions bind to it. */
  typeVersionId: string;
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
}

/** Resolves the seeded Service document type (kind 'service') + its published type-version. */
@Injectable()
export class ServiceTypeResolver {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async resolve(): Promise<ResolvedServiceType> {
    const rows = await this.db
      .select({
        typeId: documentTypes.id,
        typeVersionId: documentTypeVersions.id,
        definition: documentTypeVersions.definition,
      })
      .from(documentTypes)
      .innerJoin(
        documentTypeVersions,
        and(
          eq(documentTypeVersions.typeId, documentTypes.id),
          eq(documentTypeVersions.status, 'published'),
        ),
      )
      .where(eq(documentTypes.kind, 'service'))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new InternalServerErrorException(
        'Service document type is not seeded or has no published version (run db:seed).',
      );
    }
    return {
      typeId: row.typeId,
      typeVersionId: row.typeVersionId,
      ...toDefinition(row.definition),
    };
  }

  /** The JSON schema bound to a specific document type-version (what a document version validates against). */
  async schemaForVersion(typeVersionId: string): Promise<Record<string, unknown>> {
    return (await this.definitionForVersion(typeVersionId)).schema;
  }

  /**
   * The `{ schema, uischema }` bound to a SPECIFIC document type version (feature 174).
   *
   * This is the correct resolution for every READ path: a document version is pinned to its type
   * version by `document_versions.type_version_id` (FK, ON DELETE RESTRICT), so it must render
   * against the template it was authored under — NOT against whichever type version happens to be
   * published now. Using `resolve()` here would make every service authored before a type reshape
   * render every field empty. `resolve()` remains correct for the CREATE path only.
   *
   * An unknown id resolves to empty objects rather than throwing, so a stale reference degrades to
   * an empty page instead of a 500.
   */
  async definitionForVersion(typeVersionId: string): Promise<ServiceTypeDefinition> {
    const rows = await this.db
      .select({ definition: documentTypeVersions.definition })
      .from(documentTypeVersions)
      .where(eq(documentTypeVersions.id, typeVersionId))
      .limit(1);
    const row = rows[0];
    return row === undefined ? EMPTY_DEFINITION : toDefinition(row.definition);
  }

  /**
   * Batch form of {@link definitionForVersion}, keyed by type version id — one query for however
   * many distinct type versions a service's versions span (usually one). Unknown ids are absent
   * from the map; the caller falls back to an empty definition.
   */
  async definitionsForVersions(
    typeVersionIds: readonly string[],
  ): Promise<Record<string, ServiceTypeDefinition>> {
    const unique = [...new Set(typeVersionIds)];
    if (unique.length === 0) {
      return {};
    }
    const rows = await this.db
      .select({ id: documentTypeVersions.id, definition: documentTypeVersions.definition })
      .from(documentTypeVersions)
      .where(inArray(documentTypeVersions.id, unique));
    return Object.fromEntries(rows.map((row) => [row.id, toDefinition(row.definition)]));
  }
}
