import type { ErrorObject } from 'ajv';

/**
 * JSONForms hands a control only the validation errors at its OWN path, so a control bound to an
 * array (`faq`) never receives the errors describing its items (`/faq/0/title`). Those live on
 * `core.errors` and have to be claimed deliberately — this is what makes per-item validation
 * visible instead of silently blocking submit (MDD doc 171).
 */

/** One validation failure inside an item: which row, which field. */
export interface ItemFieldError {
  index: number;
  field: string;
  keyword: string;
}

/**
 * The instancePath prefix for a JSONForms control path. JSONForms uses dot notation (`faq`,
 * `stages.0.faq`); Ajv uses slashes (`/faq`, `/stages/0/faq`). A control nested inside a layout
 * still reports a dotted path, so this conversion — not a hardcoded `/${path}` — is what keeps the
 * filter correct for an accordion placed inside a Section, a Grid or a wizard stage.
 */
export function instancePathPrefix(path: string): string {
  return path === '' ? '' : `/${path.split('.').join('/')}`;
}

/**
 * The errors belonging to this control's ITEMS — strictly deeper than the control's own path.
 *
 * The control's own errors (e.g. `minItems` when the field is required) arrive through the regular
 * `errors` prop and are rendered by `ControlWrapper`; including them here would render them twice.
 *
 * Two Ajv shapes reach an item field:
 *  - a keyword failure ON the field — `instancePath: '/faq/0/title'`
 *  - a `required` failure on the OBJECT — `instancePath: '/faq/0'`, with the field name in
 *    `params.missingProperty`. Missing that second shape would silently drop the "you never filled
 *    this in" case, which is the most common one.
 */
export function itemFieldErrors(errors: ErrorObject[], path: string): ItemFieldError[] {
  const prefix = instancePathPrefix(path);
  const found: ItemFieldError[] = [];

  for (const error of errors) {
    if (!error.instancePath.startsWith(`${prefix}/`)) {
      continue;
    }
    const segments = error.instancePath.slice(prefix.length + 1).split('/');
    const index = Number(segments[0]);
    if (!Number.isInteger(index) || index < 0) {
      continue;
    }
    const missing = (error.params as { missingProperty?: unknown } | undefined)?.missingProperty;
    const field =
      segments.length > 1
        ? (segments[1] as string)
        : typeof missing === 'string'
          ? missing
          : undefined;
    if (field !== undefined && field !== '') {
      found.push({ index, field, keyword: error.keyword });
    }
  }
  return found;
}

/** Human-readable labels for the fields an accordion item collects. */
const FIELD_LABEL: Record<string, string> = { title: 'Title', description: 'Description' };

/**
 * Ajv's own text (`must match pattern "\S"`, `must be object`) is meaningless to someone filling in
 * a form — every failure here means the same thing to them, so say that instead.
 */
export function itemErrorMessage(field: string): string {
  return `${FIELD_LABEL[field] ?? field} is required`;
}

/** The per-field messages for one row, keyed by field name. */
export function messagesForIndex(errors: ItemFieldError[], index: number): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const error of errors) {
    if (error.index === index && messages[error.field] === undefined) {
      messages[error.field] = itemErrorMessage(error.field);
    }
  }
  return messages;
}
