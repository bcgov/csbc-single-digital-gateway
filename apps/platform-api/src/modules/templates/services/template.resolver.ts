import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { type Database, documentVersions, documents } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, eq, inArray } from 'drizzle-orm';
import type { CapabilityMap } from '@repo/forms/capabilities';
import type { DocumentTypeValue } from '../dtos/template.dtos';

/**
 * The content a renderer needs, as authored on ONE template version.
 *
 * Doc 220 added `capabilities` — what a consuming document's owner may do — and it is carried here
 * rather than dropped, because doc 221's studio gates read it from the PINNED template version. An
 * absent key means the template governs nothing, which is deliberately different from an empty map.
 */
export interface TemplateContent {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
  capabilities?: Record<string, unknown>;
}

/** An unknown template version. No `capabilities` key: an unknown template governs NOTHING. */
const EMPTY_CONTENT: TemplateContent = { schema: {}, uischema: {} };

/**
 * Split a `document_versions.content` JSONB into the parts a renderer needs, tolerating nulls.
 *
 * `capabilities` is carried only when it is actually an object. This function is the choke point every
 * read path goes through, so dropping the key here would lose the map one layer BELOW the DTO — the
 * same silent-drop shape doc 220 found in zod's `z.object`.
 */
export function toContent(content: unknown): TemplateContent {
  const value = (content ?? {}) as {
    schema?: unknown;
    uischema?: unknown;
    capabilities?: unknown;
  };
  const capabilities =
    typeof value.capabilities === 'object' &&
    value.capabilities !== null &&
    !Array.isArray(value.capabilities)
      ? (value.capabilities as Record<string, unknown>)
      : undefined;
  return {
    schema: (value.schema as Record<string, unknown> | undefined) ?? {},
    uischema: (value.uischema as Record<string, unknown> | undefined) ?? {},
    // `exactOptionalPropertyTypes`: an absent map must be an absent KEY, never an explicit undefined.
    ...(capabilities === undefined ? {} : { capabilities }),
  };
}

export interface ResolvedTemplate {
  templateId: string;
  /** The template's currently-published version — new document versions bind to it. */
  templateVersionId: string;
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
}

/**
 * Resolves the seeded GLOBAL template for a document type (feature 217), replacing the old
 * `ServiceTypeResolver` / `ServiceAgreementTypeResolver` pair — a "type" is now a
 * `documents` row with `kind = 'template'`, and its `definition` is that row's version `content`.
 */
@Injectable()
export class TemplateResolver {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** The published template for `type` — the CREATE path (what a new document binds to). */
  async resolve(type: DocumentTypeValue): Promise<ResolvedTemplate> {
    const rows = await this.db
      .select({
        templateId: documents.id,
        templateVersionId: documentVersions.id,
        content: documentVersions.content,
      })
      .from(documents)
      .innerJoin(
        documentVersions,
        and(
          eq(documentVersions.documentId, documents.id),
          eq(documentVersions.status, 'published'),
        ),
      )
      .where(and(eq(documents.kind, 'template'), eq(documents.type, type)))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new InternalServerErrorException(
        `The "${type}" template is not seeded or has no published version (run db:seed).`,
      );
    }
    return {
      templateId: row.templateId,
      templateVersionId: row.templateVersionId,
      ...toContent(row.content),
    };
  }

  /**
   * The capability map GOVERNING a document version, or `undefined` when nothing does (doc 222).
   *
   * Takes the document version's `template_version_id` straight from the row, nullable and all, so
   * no caller has to remember that an unpinned document is simply ungoverned. Deliberately NOT
   * `resolve()`: that returns whichever template version is published NOW, which would let a
   * template author retroactively re-govern documents already authored under an earlier version.
   */
  async capabilitiesForVersion(
    templateVersionId: string | null,
  ): Promise<CapabilityMap | undefined> {
    if (templateVersionId === null) return undefined;
    const { capabilities } = await this.contentForVersion(templateVersionId);
    return capabilities as CapabilityMap | undefined;
  }

  /** The JSON schema a document version pinned to `templateVersionId` validates against. */
  async schemaForVersion(templateVersionId: string): Promise<Record<string, unknown>> {
    return (await this.contentForVersion(templateVersionId)).schema;
  }

  /**
   * The `{ schema, uischema }` bound to a SPECIFIC template version (feature 174, carried forward).
   *
   * This is the correct resolution for every READ path: a document version is pinned to its
   * template version by `document_versions.template_version_id`, so it must render against the
   * template it was authored under — NOT against whichever template version happens to be
   * published now. Using `resolve()` here would make every document authored before a template
   * reshape render every field empty. `resolve()` remains correct for the CREATE path only.
   *
   * An unknown id resolves to empty objects rather than throwing, so a stale reference degrades to
   * an empty page instead of a 500.
   */
  async contentForVersion(templateVersionId: string): Promise<TemplateContent> {
    const rows = await this.db
      .select({ content: documentVersions.content })
      .from(documentVersions)
      .where(eq(documentVersions.id, templateVersionId))
      .limit(1);
    const row = rows[0];
    return row === undefined ? EMPTY_CONTENT : toContent(row.content);
  }

  /**
   * Batch form of {@link contentForVersion}, keyed by template version id — one query for however
   * many distinct template versions a document's versions span (usually one). Unknown ids are
   * absent from the map; the caller falls back to an empty content.
   */
  async contentsForVersions(
    templateVersionIds: readonly string[],
  ): Promise<Record<string, TemplateContent>> {
    const unique = [...new Set(templateVersionIds)];
    if (unique.length === 0) {
      return {};
    }
    const rows = await this.db
      .select({ id: documentVersions.id, content: documentVersions.content })
      .from(documentVersions)
      .where(inArray(documentVersions.id, unique));
    return Object.fromEntries(rows.map((row) => [row.id, toContent(row.content)]));
  }
}
