import { UnprocessableEntityException } from '@nestjs/common';
import {
  checkCapabilities,
  type CapabilityMap,
  type EditableDocument,
} from '@repo/forms/capabilities';

/**
 * Doc 222: refuses a draft edit that the governing template does not permit.
 *
 * The studio's gates (doc 221) are UX — its own Monaco uischema panel writes raw JSON, and this API
 * accepts whatever a client sends — so this is where a governed document is actually protected.
 *
 * ONE helper rather than the check inlined three times: forms, service versions and service
 * agreements all edit a draft's content the same way, and three copies of a security gate is three
 * places for one of them to be forgotten when a fourth save path appears.
 */

/**
 * A version's `content` jsonb as the validator's document shape.
 *
 * `content` is untyped at this boundary — Drizzle gives it back as `unknown` — and a malformed one
 * must not throw here: `validateContent` is the thing that rejects a bad shape, with the error
 * message the client expects. An empty stand-in simply produces no violations.
 */
const asDocument = (content: unknown): EditableDocument => {
  const { schema, uischema } = (content ?? {}) as Partial<EditableDocument>;
  return { schema: schema ?? {}, uischema: uischema ?? { type: 'Form' } };
};

export function assertWithinCapabilities(
  previousContent: unknown,
  submittedContent: unknown,
  capabilities: CapabilityMap | undefined,
): void {
  // Ungoverned: no template, or a template that authored no map. Nothing to enforce.
  if (capabilities === undefined) return;

  const violations = checkCapabilities(
    asDocument(previousContent),
    asDocument(submittedContent),
    capabilities,
    // A `dangling` violation is a diagnostic, not a refusal (doc 222 rule 7): a capability keyed on
    // an element the document no longer has must not wedge every future save.
  ).filter((violation) => violation.severity === 'refused');

  if (violations.length === 0) return;

  throw new UnprocessableEntityException({
    message: 'This change is not permitted by the template governing this document.',
    violations: violations.map(({ code, elementId, field, message }) => ({
      code,
      elementId,
      field,
      message,
    })),
  });
}
