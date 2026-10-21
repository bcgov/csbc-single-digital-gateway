import type { Document, DocumentVersion } from '@repo/database';
import { boundKeys, defaultLabel, documentContentOf, variantOf } from '@repo/documents/content';
import { validateContent } from '../../templates/services/validate-content';

/**
 * Doc 289 rules 3-5 and 15 — the PURE half of a service's application-method checks: which method version a service
 * version uses, and what is wrong with it. `ServiceMethodsService` does the reading.
 */

/** Rules 4-5: what stops `version` of application method `method` going live; `[]` = nothing. */
export function methodProblems(method: Document, version: DocumentVersion): string[] {
  try {
    validateContent(method, version.content);
  } catch (error) {
    return [error instanceof Error ? error.message : 'Invalid content'];
  }
  const content = documentContentOf(version.content);
  if (content === null) return ['Invalid content'];
  const problems: string[] = [];
  if ((defaultLabel(content) ?? '').trim() === '') problems.push('Has no title');
  const properties = content.schema['properties'];
  const declared =
    typeof properties === 'object' && properties !== null ? Object.keys(properties) : [];
  if (!boundKeys(variantOf(content)).some((key) => declared.includes(key)))
    problems.push('Has no fields');
  return problems;
}

/**
 * Rule 15: the method version a service version uses. Draft service version → the method's latest; published → the
 * method's published version; archived → the newest published at or before the service version was archived. Each
 * falls back as the doc says. `versions` are one method's, in any order.
 */
export function versionFor(
  serviceVersion: Pick<DocumentVersion, 'status' | 'archivedAt'>,
  versions: readonly DocumentVersion[],
): DocumentVersion | undefined {
  const sorted = versions.toSorted((a, b) => b.versionNumber - a.versionNumber);
  const latest = sorted[0];
  if (serviceVersion.status === 'draft') return latest;
  if (serviceVersion.status === 'published')
    return sorted.find((version) => version.status === 'published') ?? latest;
  const archivedAt = serviceVersion.archivedAt;
  const then =
    archivedAt === null
      ? undefined
      : sorted.find((version) => version.publishedAt !== null && version.publishedAt <= archivedAt);
  return then ?? sorted.find((version) => version.status !== 'draft') ?? latest;
}

/** One method's row in the precheck (rule 3: `title` / `status` null when not found). */
export interface MethodCheck {
  id: string;
  title: string | null;
  status: DocumentVersion['status'] | null;
  problems: string[];
}

/** The precheck (rules 2, 6). */
export interface PublishCheck {
  ok: boolean;
  hasMethods: boolean;
  methods: MethodCheck[];
}

/** Rule 7: why publish refuses, or `undefined` when it may go ahead. */
export function publishRefusal(check: PublishCheck): string | undefined {
  if (!check.hasMethods) return 'Add at least one application method';
  const failing = check.methods.filter((method) => method.problems.length > 0);
  if (failing.length === 0) return undefined;
  return failing
    .map((method) => `${method.title ?? 'Untitled'}: ${method.problems.join(', ')}`)
    .join('; ');
}
