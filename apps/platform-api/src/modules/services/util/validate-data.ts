import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// `strict: false` — JSONForms schemas carry presentation keywords Ajv's strict mode would reject.
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate `data` against a JSON Schema, returning human-readable error strings on failure. */
export function validateData(schema: Record<string, unknown>, data: unknown): ValidationResult {
  const validate = ajv.compile(schema);
  if (validate(data)) {
    return { valid: true, errors: [] };
  }
  const errors = (validate.errors ?? []).map((error) =>
    `${error.instancePath || '(root)'} ${error.message ?? 'is invalid'}`.trim(),
  );
  return { valid: false, errors };
}
