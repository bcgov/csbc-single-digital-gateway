import { BadRequestException } from '@nestjs/common';
import type { Document } from '@repo/database';
import { type DocumentContent, variantProblems } from '@repo/documents/content';
import { z } from 'zod';
import {
  type DocumentContentInput,
  allowedRootsFor,
  documentContentSchema,
} from '../dtos/template.dtos';

/**
 * Validate a document's `content` against its type (throws 400). Shared by every authored document — templates,
 * services and service agreements alike.
 *
 * One `DocumentContent` shape (doc 275) plus a check on each variant's ROOT: every variant's root must be one the type
 * allows. Variants need NOT share the default's root (doc 275 B1) — a Staff Form may present a citizen Funnel's
 * fields on one page. Everything below the root is opaque JSON validated by the studio.
 */
export function validateContent(document: Document, content: unknown): DocumentContentInput {
  const result = documentContentSchema.safeParse(content);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  const roots = allowedRootsFor(document.type);
  for (const [name, uischema] of Object.entries(result.data.variants)) {
    if (!roots.includes(uischema.type)) {
      throw new BadRequestException(
        `A "${document.type}" document's root must be ${roots
          .map((r) => `"${r}"`)
          .join(' or ')}, not "${uischema.type}" (variant "${name}")`,
      );
    }
  }
  return result.data;
}

/**
 * Refuse to publish content a citizen could not complete (doc 275, doc 262 rule 16): every variant must show a Control
 * for every required property. Saving such a draft is fine — an author works one variant at a time.
 */
export function assertPublishable(content: DocumentContentInput): void {
  // The validated shape is a DocumentContent whose capability map zod typed more loosely.
  const problems = variantProblems(content as unknown as DocumentContent);
  if (problems.length === 0) return;
  const detail = problems
    .map(
      ({ variant, missing }) => `"${variant}" is missing ${missing.map((m) => m.title).join(', ')}`,
    )
    .join('; ');
  throw new BadRequestException(`Every variant must show every required field: ${detail}`);
}
