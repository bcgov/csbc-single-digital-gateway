import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { DOCUMENT_TYPE, type Database, documentVersions, documents } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, eq, inArray, type SQL } from 'drizzle-orm';
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
  /** Doc 275: the uischemas by variant name; `default` is always present (possibly `{}`). */
  variants: { default: Record<string, unknown> } & Record<string, Record<string, unknown>>;
  capabilities?: Record<string, unknown>;
}

/** An unknown template version. No `capabilities` key: an unknown template governs NOTHING. */
const EMPTY_CONTENT: TemplateContent = { schema: {}, variants: { default: {} } };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Split a `document_versions.content` JSONB into the parts a renderer needs, tolerating nulls.
 *
 * `capabilities` is carried only when it is actually an object. This function is the choke point every
 * read path goes through, so dropping the key here would lose the map one layer BELOW the DTO — the
 * same silent-drop shape doc 220 found in zod's `z.object`.
 */
export function toContent(content: unknown): TemplateContent {
  const value = isRecord(content) ? content : {};
  const capabilities = isRecord(value['capabilities']) ? value['capabilities'] : undefined;
  // Doc 275: every well-formed variant, and always a `default` — `{}` when the content has none.
  const variants = Object.fromEntries(
    Object.entries(isRecord(value['variants']) ? value['variants'] : {}).filter(([, uischema]) =>
      isRecord(uischema),
    ),
  ) as Record<string, Record<string, unknown>>;
  return {
    schema: isRecord(value['schema']) ? value['schema'] : {},
    variants: { ...variants, default: variants['default'] ?? {} },
    // `exactOptionalPropertyTypes`: an absent map must be an absent KEY, never an explicit undefined.
    ...(capabilities === undefined ? {} : { capabilities }),
  };
}

export interface ResolvedTemplate {
  templateId: string;
  /** The template's currently-published version — new document versions bind to it. */
  templateVersionId: string;
  schema: Record<string, unknown>;
  variants: TemplateContent['variants'];
}

/** How a refusal names a type — the API's own words, matching the console's labels (doc 226). */
const TYPE_NOUN: Readonly<Record<DocumentTypeValue, string>> = Object.freeze({
  [DOCUMENT_TYPE.service]: 'service',
  [DOCUMENT_TYPE.applicationMethod]: 'application method',
  [DOCUMENT_TYPE.serviceAgreement]: 'service agreement',
});

/**
 * Resolves the TEMPLATE a document is built from (feature 217), replacing the old per-type
 * resolvers — a "type" is a `documents` row with `kind = 'template'`, its definition that row's
 * version `content`.
 *
 * Doc 228: several templates of one type may exist, so there is no "THE template of a type" any
 * more. A new document names its template ({@link forCreate}); a new VERSION of an existing
 * document follows the template the document already names ({@link forDocument}) — which
 * `document_versions_template_fk` requires anyway, since a version's `template_id` must equal its
 * document's.
 */
@Injectable()
export class TemplateResolver {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /**
   * The CREATE path: the published version of the template a new document of `type` binds to.
   *
   * With `templateId`: that template, which must be a `kind = 'template'` row of `type` with a
   * published version (400 otherwise — the id is caller input). Without: the ONLY published
   * template of `type`, so a caller with no choice to make need not make one; zero or several is
   * a 400 that says so.
   */
  async forCreate(type: DocumentTypeValue, templateId?: string): Promise<ResolvedTemplate> {
    const rows = await this.publishedTemplates(
      and(
        eq(documents.kind, 'template'),
        eq(documents.type, type),
        templateId === undefined ? undefined : eq(documents.id, templateId),
      ),
    );
    const noun = TYPE_NOUN[type];
    if (templateId !== undefined) {
      return this.toResolved(
        rows[0],
        () => new BadRequestException(`Template not found, or not a published ${noun} template.`),
      );
    }
    if (rows.length === 0) {
      throw new BadRequestException(
        `No ${noun} template is published yet. An admin must publish one first.`,
      );
    }
    if (rows.length > 1) {
      throw new BadRequestException(
        `Choose a template: ${String(rows.length)} ${noun} templates are published.`,
      );
    }
    return this.toResolved(rows[0], () => new Error('unreachable'));
  }

  /**
   * The ADD-VERSION path: the published version of the template the document already names
   * (`documents.template_id`). 409 when there is none — the template was unpublished, or its
   * published version deleted (doc 227), since the document was created.
   */
  async forDocument(templateId: string | null): Promise<ResolvedTemplate> {
    const rows =
      templateId === null
        ? []
        : await this.publishedTemplates(
            and(eq(documents.kind, 'template'), eq(documents.id, templateId)),
          );
    return this.toResolved(
      rows[0],
      () =>
        new ConflictException(
          "This document's template has no published version, so a new version can't be started.",
        ),
    );
  }

  private publishedTemplates(where: SQL | undefined) {
    return this.db
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
      .where(where);
  }

  private toResolved(
    row: { templateId: string; templateVersionId: string; content: unknown } | undefined,
    missing: () => Error,
  ): ResolvedTemplate {
    if (row === undefined) throw missing();
    const { schema, variants } = toContent(row.content);
    // Never the capabilities: a document copies a template's schema and variants, not its rules.
    return {
      templateId: row.templateId,
      templateVersionId: row.templateVersionId,
      schema,
      variants,
    };
  }

  /**
   * The capability map GOVERNING a document version, or `undefined` when nothing does (doc 222).
   *
   * Takes the document version's `template_version_id` straight from the row, nullable and all, so
   * no caller has to remember that an unpinned document is simply ungoverned. Deliberately NOT
   * `forCreate()`: that returns whichever template version is published NOW, which would let a
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
   * The `{ schema, variants, capabilities? }` bound to a SPECIFIC template version (feature 174, carried forward).
   *
   * This is the correct resolution for every READ path: a document version is pinned to its
   * template version by `document_versions.template_version_id`, so it must render against the
   * template it was authored under — NOT against whichever template version happens to be
   * published now. Using `forCreate()` here would make every document authored before a template
   * reshape render every field empty. `forCreate()` remains correct for the CREATE path only.
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
