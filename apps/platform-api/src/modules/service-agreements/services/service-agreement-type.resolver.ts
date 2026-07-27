import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { type Database, documentTypeVersions, documentTypes } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, eq } from 'drizzle-orm';

export interface ResolvedAgreementType {
  typeId: string;
  /** The Service Agreement type's currently-published version — new document versions bind to it. */
  typeVersionId: string;
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
}

/** Resolves the seeded Service Agreement document type (kind 'service-agreement') + its published version. */
@Injectable()
export class ServiceAgreementTypeResolver {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async resolve(): Promise<ResolvedAgreementType> {
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
      .where(eq(documentTypes.kind, 'service-agreement'))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new InternalServerErrorException(
        'Service Agreement document type is not seeded or has no published version (run db:seed).',
      );
    }
    const definition = row.definition as { schema?: unknown; uischema?: unknown };
    return {
      typeId: row.typeId,
      typeVersionId: row.typeVersionId,
      schema: (definition.schema as Record<string, unknown> | undefined) ?? {},
      uischema: (definition.uischema as Record<string, unknown> | undefined) ?? {},
    };
  }

  /** The JSON schema bound to a specific type-version (what a document version validates against). */
  async schemaForVersion(typeVersionId: string): Promise<Record<string, unknown>> {
    const rows = await this.db
      .select({ definition: documentTypeVersions.definition })
      .from(documentTypeVersions)
      .where(eq(documentTypeVersions.id, typeVersionId))
      .limit(1);
    const definition = rows[0]?.definition as { schema?: unknown } | undefined;
    return (definition?.schema as Record<string, unknown> | undefined) ?? {};
  }
}
