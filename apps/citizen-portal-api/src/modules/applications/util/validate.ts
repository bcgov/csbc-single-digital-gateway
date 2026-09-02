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

// ── Number decimal-places validation (feature 155) ─────────────────────────────────────────────────
//
// A decimal number control (`options.decimals: N`) limits how many digits may follow the decimal
// point. This is checked by counting decimals in the submitted value's string form (not via Ajv
// `multipleOf`, which is floating-point fragile). The renderer enforces the same limit client-side.

/** A decimal-places constraint: the field key and the max digits allowed after the decimal point. */
export interface DecimalConstraint {
  key: string;
  maxDecimals: number;
}

/** Digits after the decimal point in a number's canonical string form (exponent-aware). */
function decimalCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const s = value.toString().toLowerCase();
  if (s.includes('e-')) {
    const [mantissa, expPart] = s.split('e-');
    return (mantissa?.split('.')[1] ?? '').length + Number(expPart);
  }
  return (s.split('.')[1] ?? '').length;
}

/** Recursively collect the decimal-places constraints of every number control in a uischema tree. */
function decimalConstraintsFromUischema(
  uischema: Record<string, unknown> | undefined,
): DecimalConstraint[] {
  if (!uischema) {
    return [];
  }
  const constraints: DecimalConstraint[] = [];
  const options = asRecord(uischema.options);
  const decimals = options?.decimals;
  if (uischema.type === 'Control' && typeof decimals === 'number') {
    const key = ADDRESS_SCOPE.exec(asText(uischema.scope))?.[1];
    if (key !== undefined) {
      constraints.push({ key, maxDecimals: decimals });
    }
  }
  const elements = Array.isArray(uischema.elements) ? uischema.elements : [];
  for (const child of elements) {
    constraints.push(...decimalConstraintsFromUischema(asRecord(child)));
  }
  return constraints;
}

/** Every number field with a decimal-places limit in the form (basic = one uischema; multi-stage = one per page). */
export function collectDecimalConstraints(
  kind: string,
  structure: Record<string, unknown>,
): DecimalConstraint[] {
  const uischemas: Array<Record<string, unknown> | undefined> =
    kind === 'multi-stage-form'
      ? ((structure['stages'] as MultiStageStage[] | undefined) ?? []).flatMap((stage) =>
          (stage.pages ?? []).map((page) => page.uischema),
        )
      : [structure['uischema'] as Record<string, unknown> | undefined];
  const byKey = new Map<string, DecimalConstraint>();
  for (const c of uischemas.flatMap(decimalConstraintsFromUischema)) {
    byKey.set(c.key, c);
  }
  return [...byKey.values()];
}

/** Reject any submitted number that exceeds its field's decimal-places limit. Non-numbers are ignored. */
export function validateDecimals(constraints: DecimalConstraint[], data: unknown): string[] {
  const record = asRecord(data) ?? {};
  const errors: string[] = [];
  for (const { key, maxDecimals } of constraints) {
    const value = record[key];
    if (typeof value === 'number' && decimalCount(value) > maxDecimals) {
      errors.push(
        `${key}: enter at most ${maxDecimals} decimal place${maxDecimals === 1 ? '' : 's'}`,
      );
    }
  }
  return errors;
}

// ── Address read-only lock enforcement (feature 170) ─────────────────────────────────────────────
//
// An author can lock an address sub-field (`uischema.options.fields.<sub>.readOnly`) to its default
// (`schema.properties.<key>.default.<sub>`). The rendered field is read-only, but that is a UX
// affordance only — a crafted request can send anything, so the lock is enforced here at submit.
// Pure and synchronous: unlike the postal-code pass, the expected value comes from the form
// definition already in hand, so there is no geo lookup.

/** One locked address sub-field and the value the author pinned it to. */
export interface AddressLockConstraint {
  /** The address field's property key. */
  key: string;
  /** The locked sub-field, e.g. `country`. */
  field: string;
  /** The author's default — the only value the citizen may submit for it. */
  expected: string;
}

/** The (schema, uischema) pairs of a form — one for a basic form, one per page for multi-stage. */
function schemaUischemaPairs(
  kind: string,
  structure: Record<string, unknown>,
): Array<{ schema: Record<string, unknown>; uischema: Record<string, unknown> | undefined }> {
  if (kind === 'multi-stage-form') {
    return ((structure['stages'] as MultiStageStage[] | undefined) ?? []).flatMap((stage) =>
      (stage.pages ?? []).map((page) => ({
        schema: page.schema ?? {},
        uischema: page.uischema,
      })),
    );
  }
  return [
    {
      schema: (structure['schema'] as Record<string, unknown> | undefined) ?? {},
      uischema: structure['uischema'] as Record<string, unknown> | undefined,
    },
  ];
}

/** Recursively collect every address control's key + its per-sub-field option bag. */
function addressLockNodes(
  uischema: Record<string, unknown> | undefined,
): Array<{ key: string; fields: Record<string, unknown> }> {
  if (!uischema) {
    return [];
  }
  const found: Array<{ key: string; fields: Record<string, unknown> }> = [];
  const options = asRecord(uischema.options);
  if (uischema.type === 'Control' && options?.format === 'address') {
    const key = ADDRESS_SCOPE.exec(asText(uischema.scope))?.[1];
    const fields = asRecord(options.fields);
    if (key !== undefined && fields !== undefined) {
      found.push({ key, fields });
    }
  }
  const elements = Array.isArray(uischema.elements) ? uischema.elements : [];
  for (const child of elements) {
    found.push(...addressLockNodes(asRecord(child)));
  }
  return found;
}

/**
 * Every locked address sub-field in the form, paired with the default it is pinned to. A lock whose
 * schema carries no matching default yields NO constraint (fail-open, by design: the alternative is
 * a form no submission can ever satisfy).
 */
export function collectAddressLocks(
  kind: string,
  structure: Record<string, unknown>,
): AddressLockConstraint[] {
  const constraints: AddressLockConstraint[] = [];
  for (const { schema, uischema } of schemaUischemaPairs(kind, structure)) {
    const properties = asRecord(schema.properties) ?? {};
    for (const { key, fields } of addressLockNodes(uischema)) {
      const defaults = asRecord(asRecord(properties[key])?.default) ?? {};
      for (const [field, bag] of Object.entries(fields)) {
        if (asRecord(bag)?.readOnly !== true) {
          continue;
        }
        const expected = asText(defaults[field]);
        if (expected !== '') {
          constraints.push({ key, field, expected });
        }
      }
    }
  }
  return constraints;
}

/**
 * Reject any submitted address sub-field that is locked and disagrees with its default. An address
 * the citizen never touched at all (key absent from the data) imposes no constraint; once the object
 * is present, a locked sub-field must match exactly — including when it was blanked out.
 */
export function validateAddressLocks(
  constraints: AddressLockConstraint[],
  data: unknown,
): string[] {
  const record = asRecord(data) ?? {};
  const errors: string[] = [];
  for (const { key, field, expected } of constraints) {
    const address = asRecord(record[key]);
    if (!address) {
      continue;
    }
    if (asText(address[field]) !== expected) {
      errors.push(`${key}.${field}: must be "${expected}"`);
    }
  }
  return errors;
}
