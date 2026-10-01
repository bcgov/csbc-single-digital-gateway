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
export interface DocumentContent {
  schema: Record<string, unknown>;
  variants: { default: Uischema } & Record<string, Uischema>;
}

export const DEFAULT_VARIANT = 'default';

/** The content a new document opens with: an empty schema and an empty default variant. */
export function blankContent(): DocumentContent {
  return {
    schema: { type: 'object', properties: {} },
    variants: { default: {} },
  };
}

/** `content` with `variant`'s uischema replaced — `content` itself is left untouched. */
export function withVariant(
  content: DocumentContent,
  uischema: Uischema,
  variant: string = DEFAULT_VARIANT,
): DocumentContent {
  return { ...content, variants: { ...content.variants, [variant]: uischema } };
}

/** Whether two contents differ — the studio's dirty check. Key order counts, which is fine for a spike. */
export function contentChanged(a: DocumentContent, b: DocumentContent): boolean {
  return (
    JSON.stringify(a.schema) !== JSON.stringify(b.schema) ||
    JSON.stringify(a.variants) !== JSON.stringify(b.variants)
  );
}
