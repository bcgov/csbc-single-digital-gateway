import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

/**
 * Doc 230: validates a service version's staff answers (`content.data`) against the version's OWN form
 * (`content.schema`) — the check Publish runs, so a service is never published with answers its form
 * rejects.
 *
 * Configured like the validator JSONForms gives the runner in the browser (`createAjv`: all errors,
 * formats, not strict about unknown keywords), so the page's "Publish is disabled" and this endpoint's
 * refusal agree about what is valid. One instance: Ajv caches compiled schemas by content.
 */
const ajv = new Ajv({ allErrors: true, strict: false, verbose: true });
addFormats(ajv);

/** Human-readable problems with `data`, or `[]` when it is valid. */
export function answerErrors(schema: Record<string, unknown>, data: unknown): string[] {
  let validate: ReturnType<typeof ajv.compile>;
  try {
    validate = ajv.compile(schema);
  } catch {
    // The form itself is broken — the author's problem, but still a reason not to publish.
    return ["The service's form schema is invalid"];
  }
  if (validate(data)) return [];
  return (validate.errors ?? []).map(describe);
}

function describe(error: ErrorObject): string {
  const missing = (error.params as { missingProperty?: unknown }).missingProperty;
  if (error.keyword === 'required' && typeof missing === 'string') {
    return `${pointer(error.instancePath, missing)} is required`;
  }
  return `${pointer(error.instancePath)} ${error.message ?? 'is invalid'}`;
}

/** `/a/b` + `c` → `a.b.c`; the root reads as "answers". */
function pointer(instancePath: string, leaf?: string): string {
  const parts = [...instancePath.split('/').filter(Boolean), ...(leaf === undefined ? [] : [leaf])];
  return parts.length === 0 ? 'answers' : parts.join('.');
}
