import type { CapabilityMap } from './capabilities/capability-types';
/**
 * The document vocabulary the studio works in. Restated here rather than imported from `@repo/database`
 * so the package stays browser-only; the values mirror `DOCUMENT_TYPES` and must be kept in step with it.
 */
export const DOCUMENT_KINDS = ['document', 'template'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_TYPES = [
  'services.service',
  'services.service-agreement',
  'services.service-application-method',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

interface DocumentTypeInfo {
  label: string;
  description: string;
}

export const DOCUMENT_TYPE_INFO: Record<DocumentType, DocumentTypeInfo> = {
  'services.service': {
    label: 'Service',
    description: 'A service citizens can discover: what it is, who it is for and how to apply.',
  },
  'services.service-agreement': {
    label: 'Service Agreement',
    description: 'Terms a citizen reads and consents to before using a service.',
  },
  'services.service-application-method': {
    label: 'Application Method',
    description: 'A form or multi-stage flow citizens fill in to apply for a service.',
  },
};

/** One JSONForms uischema. An empty object is a variant nobody has started yet. */
export type Uischema = Record<string, unknown>;

/**
 * A version's whole payload: ONE schema and the uischemas that present it. Each variant is an independent
 * uischema over the same schema; `default` is mandatory and is the one shown unless another is asked for.
 */
// A `type`, not an `interface`, so it is assignable to `Record<string, unknown>` — what a jsonb column takes (doc 275).
export type DocumentContent = {
  schema: Record<string, unknown>;
  variants: { default: Uischema } & Record<string, Uischema>;
  /** A TEMPLATE's Implementation Rules (doc 258); absent = everything granted. */
  capabilities?: CapabilityMap;
};

export const DEFAULT_VARIANT = 'default';

/** The content a new document opens with: an empty schema and an empty default variant. */
export function blankContent(): DocumentContent {
  return {
    schema: { type: 'object', properties: {} },
    variants: { default: {} },
  };
}

/** `variant`'s uischema (doc 262); `{}` — a variant nobody has started — when there is none by that name. */
export function variantOf(content: DocumentContent, variant: string = DEFAULT_VARIANT): Uischema {
  return Object.hasOwn(content.variants, variant) ? (content.variants[variant] ?? {}) : {};
}

/** `content` with `variant`'s uischema replaced — `content` itself is left untouched. */
export function withVariant(
  content: DocumentContent,
  uischema: Uischema,
  variant: string = DEFAULT_VARIANT,
): DocumentContent {
  return { ...content, variants: { ...content.variants, [variant]: uischema } };
}

/** The variants in tab order: `default` first, then the rest in authored order (doc 262). */
export function variantNames(content: DocumentContent): string[] {
  const names = Object.keys(content.variants);
  return [DEFAULT_VARIANT, ...names.filter((name) => name !== DEFAULT_VARIANT)];
}

/** The default variant's `label` — what the database derives a version's title from (doc 275). */
export function defaultLabel(content: DocumentContent): string | undefined {
  const label = variantOf(content)['label'];
  return typeof label === 'string' ? label : undefined;
}

/** `content` with the default variant's `label` set — how a new document or template is named (doc 275). */
export function withDefaultLabel(content: DocumentContent, label: string): DocumentContent {
  return withVariant(content, { ...variantOf(content), label });
}

/**
 * `value` as a document's content when it has the shape (doc 275): a `schema` object and a `variants` object whose
 * `default` is an object; `capabilities` is carried through when it is an object. `null` for anything else.
 */
export function documentContentOf(value: unknown): DocumentContent | null {
  if (!isPlainObject(value)) return null;
  const { schema, variants, capabilities } = value;
  if (!isPlainObject(schema) || !isPlainObject(variants) || !isPlainObject(variants['default']))
    return null;
  const named = Object.entries(variants).filter(([, uischema]) => isPlainObject(uischema));
  return {
    schema,
    variants: Object.fromEntries(named) as DocumentContent['variants'],
    ...(isPlainObject(capabilities) && { capabilities: capabilities as CapabilityMap }),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether two contents differ — the studio's dirty check. Key order counts, which is fine for a spike. */
export function contentChanged(a: DocumentContent, b: DocumentContent): boolean {
  return (
    JSON.stringify(a.schema) !== JSON.stringify(b.schema) ||
    JSON.stringify(a.variants) !== JSON.stringify(b.variants) ||
    JSON.stringify(a.capabilities ?? null) !== JSON.stringify(b.capabilities ?? null)
  );
}
