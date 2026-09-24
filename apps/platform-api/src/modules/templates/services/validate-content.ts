import { BadRequestException } from '@nestjs/common';
import type { Document } from '@repo/database';
import { z } from 'zod';
import {
  type StudioDocumentInput,
  allowedRootsFor,
  studioDocumentSchema,
} from '../dtos/template.dtos';

/**
 * Validate a document's `content` against its type (throws 400). Shared by every authored
 * document — templates, services and service agreements alike.
 *
 * Feature 217 replaced four per-kind `definition` schemas with one `StudioDocument` shape plus a
 * check on the uischema ROOT: `@repo/forms` root-only boundaries differ per type (a `Service`, a
 * `Form`, or a `Flow`), and everything below the root is opaque JSON validated by the studio's own
 * metaschema, not here.
 */
export function validateContent(document: Document, content: unknown): StudioDocumentInput {
  const result = studioDocumentSchema.safeParse(content);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
  const roots = allowedRootsFor(document.type);
  const root = result.data.uischema.type;
  if (!roots.includes(root)) {
    throw new BadRequestException(
      `A "${document.type}" document's uischema root must be ${roots
        .map((r) => `"${r}"`)
        .join(' or ')}, not "${root}"`,
    );
  }
  return result.data;
}
