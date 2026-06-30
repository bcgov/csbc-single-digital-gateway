import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// `strict: false` — JSONForms schemas carry presentation keywords Ajv's strict mode would reject.
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateAgainst(schema: Record<string, unknown>, data: unknown): string[] {
  const validate = ajv.compile(schema);
  if (validate(data)) {
    return [];
  }
  return (validate.errors ?? []).map((error) =>
    `${error.instancePath || '(root)'} ${error.message ?? 'is invalid'}`.trim(),
  );
}

interface MultiStagePage {
  schema?: Record<string, unknown>;
}
interface MultiStageStage {
  pages?: MultiStagePage[];
}

/**
 * Validate submitted answers against the form's JSON Schema(s). Basic forms validate against the
 * single schema; multi-stage forms validate against every page's schema (extra properties from
 * other pages are ignored, so the shared `data` object validates cleanly per page).
 */
export function validateSubmission(
  kind: string,
  structure: Record<string, unknown>,
  data: unknown,
): ValidationResult {
  const schemas: Array<Record<string, unknown>> =
    kind === 'multi-stage-form'
      ? ((structure['stages'] as MultiStageStage[] | undefined) ?? []).flatMap((stage) =>
          (stage.pages ?? []).map((page) => page.schema ?? {}),
        )
      : [(structure['schema'] as Record<string, unknown> | undefined) ?? {}];
  const errors = schemas.flatMap((schema) => validateAgainst(schema, data));
  return { valid: errors.length === 0, errors };
}
