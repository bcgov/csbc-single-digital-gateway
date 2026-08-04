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
  uischema?: Record<string, unknown>;
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

// ── Address postal-code validation (feature 153) ─────────────────────────────────────────────────
//
// The address control (`options.format: 'address'`) stores an object under its property key. The
// postal-code format is country-dependent and only known at submit time, so it can't live in the
// static JSON Schema — we resolve the entered country's regex (from geo reference data) at submit.

/** A postal code to validate: the field key, the entered country name, and the entered postal. */
export interface AddressPostalEntry {
  key: string;
  country: string;
  postal: string;
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;

const asText = (value: unknown): string => (typeof value === 'string' ? value : '');

const ADDRESS_SCOPE = /^#\/properties\/(.+)$/;

/** Recursively collect the property keys of every address control in a uischema tree. */
function addressKeysFromUischema(uischema: Record<string, unknown> | undefined): string[] {
  if (!uischema) {
    return [];
  }
  const keys: string[] = [];
  const options = asRecord(uischema.options);
  if (uischema.type === 'Control' && options?.format === 'address') {
    const key = ADDRESS_SCOPE.exec(asText(uischema.scope))?.[1];
    if (key !== undefined) {
      keys.push(key);
    }
  }
  const elements = Array.isArray(uischema.elements) ? uischema.elements : [];
  for (const child of elements) {
    keys.push(...addressKeysFromUischema(asRecord(child)));
  }
  return keys;
}

/**
 * Find every address field in the form + the citizen's entered country/postal for it. Only entries
 * with BOTH a country and a non-empty postal are returned (empty postal is allowed — postal
 * requiredness is not enforced here). Basic forms carry one uischema; multi-stage forms carry one per
 * page.
 */
export function collectAddressPostals(
  kind: string,
  structure: Record<string, unknown>,
  data: unknown,
): AddressPostalEntry[] {
  const uischemas: Array<Record<string, unknown> | undefined> =
    kind === 'multi-stage-form'
      ? ((structure['stages'] as MultiStageStage[] | undefined) ?? []).flatMap((stage) =>
          (stage.pages ?? []).map((page) => page.uischema),
        )
      : [structure['uischema'] as Record<string, unknown> | undefined];
  const record = asRecord(data) ?? {};
  const keys = [...new Set(uischemas.flatMap(addressKeysFromUischema))];
  return keys.flatMap((key): AddressPostalEntry[] => {
    const address = asRecord(record[key]);
    if (!address) {
      return [];
    }
    const country = asText(address.country);
    const postal = asText(address.postal_code);
    return country && postal ? [{ key, country, postal }] : [];
  });
}

/**
 * Validate each collected postal against a per-country regex resolver (backed by geo reference data
 * in the service). A country with no known regex (or an unknown country) imposes no constraint. A
 * malformed regex is treated as "no constraint" (never throws). Returns human-readable error strings.
 */
export function validateAddressPostals(
  entries: AddressPostalEntry[],
  regexFor: (country: string) => string | null | undefined,
): string[] {
  const errors: string[] = [];
  for (const entry of entries) {
    const pattern = regexFor(entry.country);
    if (!pattern) {
      continue;
    }
    let re: RegExp;
    try {
      re = new RegExp(pattern);
    } catch {
      continue;
    }
    if (!re.test(entry.postal)) {
      errors.push(
        `${entry.key}: "${entry.postal}" is not a valid postal code for ${entry.country}`,
      );
    }
  }
  return errors;
}
