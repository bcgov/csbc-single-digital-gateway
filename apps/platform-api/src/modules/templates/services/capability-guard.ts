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

type Violation = { code: string; elementId?: string; field?: string; message: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A version's `content` jsonb as its schema and its variants (doc 275).
 *
 * `content` is untyped at this boundary — Drizzle gives it back as `unknown` — and a malformed one
 * must not throw here: `validateContent` is the thing that rejects a bad shape, with the error
 * message the client expects. An empty stand-in simply produces no violations.
 */
function partsOf(content: unknown): {
  schema: EditableDocument['schema'];
  variants: Record<string, EditableDocument['uischema']>;
} {
  const value = isRecord(content) ? content : {};
  const variants = Object.fromEntries(
    Object.entries(isRecord(value['variants']) ? value['variants'] : {}).filter(([, uischema]) =>
      isRecord(uischema),
    ),
  ) as Record<string, EditableDocument['uischema']>;
  return {
    schema: (isRecord(value['schema']) ? value['schema'] : {}) as EditableDocument['schema'],
    variants,
  };
}

/**
 * Doc 275: the template's map governs EVERY variant, so the check runs once per variant, each against its own previous
 * self. A governed document may not gain or lose a variant — the template decides the presentations. Violations the
 * shared schema raises once per variant are reported once.
 */
function violationsOf(
  previousContent: unknown,
  submittedContent: unknown,
  capabilities: CapabilityMap,
): Violation[] {
  const previous = partsOf(previousContent);
  const submitted = partsOf(submittedContent);
  const names = new Set([...Object.keys(previous.variants), ...Object.keys(submitted.variants)]);
  const found = new Map<string, Violation>();
  for (const name of names) {
    const before = previous.variants[name];
    const after = submitted.variants[name];
    if (before === undefined || after === undefined) {
      const code = before === undefined ? 'variant-added' : 'variant-removed';
      found.set(`${code}:${name}`, {
        code,
        message: `The template governing this document does not allow the "${name}" variant to be ${
          before === undefined ? 'added' : 'removed'
        }.`,
      });
      continue;
    }
    const refused = checkCapabilities(
      { schema: previous.schema, uischema: before },
      { schema: submitted.schema, uischema: after },
      capabilities,
      // A `dangling` violation is a diagnostic, not a refusal (doc 222 rule 7): a capability keyed on
      // an element the document no longer has must not wedge every future save.
    ).filter((violation) => violation.severity === 'refused');
    for (const { code, elementId, field, message } of refused)
      found.set(`${code}:${elementId ?? ''}:${field ?? ''}`, {
        code,
        ...(elementId !== undefined && { elementId }),
        ...(field !== undefined && { field }),
        message,
      });
  }
  return [...found.values()];
}

export function assertWithinCapabilities(
  previousContent: unknown,
  submittedContent: unknown,
  capabilities: CapabilityMap | undefined,
): void {
  // Ungoverned: no template, or a template that authored no map. Nothing to enforce.
  if (capabilities === undefined) return;
  const violations = violationsOf(previousContent, submittedContent, capabilities);
  if (violations.length === 0) return;
  throw new UnprocessableEntityException({
    message: 'This change is not permitted by the template governing this document.',
    violations,
  });
}
