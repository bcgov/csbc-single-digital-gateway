import {
  DEFAULT_VARIANT,
  type DocumentContent,
  type Uischema,
  variantOf,
  withVariant,
} from '../document-types';

// Doc 284: a variant that PRESENTS the document and is never filled in. Pure — the content entry, the studio and the
// runner all ask it.

/** Rule 1: a variant root marked `options.displayOnly: true`. The caller never asks it of `default` (see below). */
export function isDisplayOnly(root: unknown): boolean {
  const options = recordOf(recordOf(root)?.['options']);
  return options?.['displayOnly'] === true;
}

/** Rule 1: whether variant `name` is display only — never `default`, whatever its options hold. */
export function isDisplayOnlyVariant(content: DocumentContent, name: string): boolean {
  return name !== DEFAULT_VARIANT && isDisplayOnly(content.variants[name]);
}

/**
 * Rule 2: variant `name` marked display only (`on`) or ordinary — the key REMOVED when off, every other option kept. The
 * SAME content for `default`, an unknown variant, or no change.
 */
export function withDisplayOnly(
  content: DocumentContent,
  name: string,
  on: boolean,
): DocumentContent {
  if (name === DEFAULT_VARIANT || !Object.hasOwn(content.variants, name)) return content;
  const root = variantOf(content, name);
  if (isDisplayOnly(root) === on) return content;
  const { displayOnly: _was, ...options } = recordOf(root['options']) ?? {};
  const next: Uischema = on
    ? { ...root, options: { ...options, displayOnly: true } }
    : Object.keys(options).length === 0
      ? withoutOptions(root)
      : { ...root, options };
  return withVariant(content, next, name);
}

function withoutOptions(root: Uischema): Uischema {
  const { options: _options, ...rest } = root;
  return rest;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
