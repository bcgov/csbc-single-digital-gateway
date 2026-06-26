import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  type Database,
  documentReferences,
  documentTypeVersions,
  documentTypes,
  documentVersions,
  documents,
} from '@repo/database';
import { and, eq } from 'drizzle-orm';
import type { ApplicationInput } from '../dtos/service.dtos';

const FORM_KINDS = new Set(['basic-form', 'multi-stage-form']);

/** Transaction handle (the argument drizzle passes to `db.transaction(cb)`). */
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/** An application pre-resolved + validated against the DB, ready to insert inside a transaction. */
export type ResolvedApplication = {
  id: string | undefined;
  label: string;
  position: number;
} & (
  | { mode: 'existing'; versionId: string; documentId: string; kind: string }
  | {
      mode: 'new';
      typeId: string;
      typeVersionId: string;
      kind: string;
      title: string;
      definition: Record<string, unknown>;
      /** Builder-authored `{ schema, uischema }` overriding the type template, if provided. */
      designedDefinition: Record<string, unknown> | undefined;
    }
);

/**
 * The structure to copy into a new form document's `document_versions.schema`, taken from the type
 * definition: `{ schema, uischema }` for basic-form, `{ stages }` for multi-stage-form, NULL otherwise.
 */
export function structureFromDefinition(
  kind: string,
  definition: Record<string, unknown>,
): Record<string, unknown> | null {
  if (kind === 'basic-form') {
    return { schema: definition.schema ?? {}, uischema: definition.uischema ?? {} };
  }
  if (kind === 'multi-stage-form') {
    return { stages: definition.stages ?? [] };
  }
  return null;
}

/**
 * Validate each application against the live DB (reads via `db`) so the caller gets clean 400/404/422
 * before opening a write transaction. Existing form targets must be a form kind in this workspace and not
 * the service itself; new-form types must be a published form type.
 */
export async function resolveApplications(
  db: Database,
  serviceId: string,
  workspaceId: string,
  applications: ApplicationInput[],
): Promise<ResolvedApplication[]> {
  return Promise.all(
    applications.map(async (app) => {
      const common = { id: app.id, label: app.label, position: app.position };
      if (app.form.mode === 'existing') {
        const rows = await db
          .select({
            documentId: documents.id,
            kind: documents.kind,
            workspaceId: documents.workspaceId,
          })
          .from(documentVersions)
          .innerJoin(documents, eq(documents.id, documentVersions.documentId))
          .where(eq(documentVersions.id, app.form.versionId))
          .limit(1);
        const row = rows[0];
        if (row === undefined) {
          throw new NotFoundException('Application form version not found');
        }
        if (row.workspaceId !== workspaceId) {
          throw new BadRequestException('Application form is in a different workspace');
        }
        if (row.documentId === serviceId) {
          throw new BadRequestException('A service cannot reference itself');
        }
        if (!FORM_KINDS.has(row.kind)) {
          throw new BadRequestException('An application must reference a form');
        }
        return {
          ...common,
          mode: 'existing',
          versionId: app.form.versionId,
          documentId: row.documentId,
          kind: row.kind,
        };
      }
      const rows = await db
        .select({
          kind: documentTypes.kind,
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
        .where(eq(documentTypes.id, app.form.typeId))
        .limit(1);
      const row = rows[0];
      if (row === undefined) {
        throw new UnprocessableEntityException('Form type not found or has no published version');
      }
      if (!FORM_KINDS.has(row.kind)) {
        throw new BadRequestException(
          'A new application form must be a basic-form or multi-stage-form type',
        );
      }
      return {
        ...common,
        mode: 'new',
        typeId: app.form.typeId,
        typeVersionId: row.typeVersionId,
        kind: row.kind,
        title: app.form.title,
        definition: row.definition,
        designedDefinition: app.form.definition,
      };
    }),
  );
}

/** Insert one resolved application (creating its form first when `mode: 'new'`) inside a transaction. */
export async function insertApplication(
  tx: Tx,
  owner: { ownerVersionId: string; ownerDocumentId: string; workspaceId: string },
  app: ResolvedApplication,
): Promise<void> {
  let targetVersionId: string;
  let targetDocumentId: string;
  if (app.mode === 'new') {
    const insertedDoc = await tx
      .insert(documents)
      .values({
        typeId: app.typeId,
        workspaceId: owner.workspaceId,
        kind: app.kind,
        title: app.title,
      })
      .returning();
    const formDoc = insertedDoc[0];
    if (formDoc === undefined) {
      throw new Error('form document insert returned no row');
    }
    const insertedVersion = await tx
      .insert(documentVersions)
      .values({
        documentId: formDoc.id,
        typeId: app.typeId,
        typeVersionId: app.typeVersionId,
        version: 1,
        // Prefer the builder-authored definition; otherwise copy the type template (feature 41).
        // `data` stays default values ({}).
        schema: app.designedDefinition ?? structureFromDefinition(app.kind, app.definition),
      })
      .returning();
    const formVersion = insertedVersion[0];
    if (formVersion === undefined) {
      throw new Error('form version insert returned no row');
    }
    targetVersionId = formVersion.id;
    targetDocumentId = formDoc.id;
  } else {
    targetVersionId = app.versionId;
    targetDocumentId = app.documentId;
  }

  await tx.insert(documentReferences).values({
    ownerVersionId: owner.ownerVersionId,
    ownerDocumentId: owner.ownerDocumentId,
    ownerKind: 'service',
    targetVersionId,
    targetDocumentId,
    targetKind: app.kind,
    workspaceId: owner.workspaceId,
    relation: 'application_form',
    label: app.label,
    position: app.position,
  });
}
