import type { json } from 'monaco-editor';

// Metaschema registration on Monaco's JSON language (doc 191 rules 7-8). Part of the lazy editor chunk.

type JsonDefaults = typeof json.jsonDefaults;
type SchemaEntry = NonNullable<JsonDefaults['diagnosticsOptions']['schemas']>[number];

/** Rule 8: strict JSON, no network schema requests, and metaschema violations reported as errors. */
export const STUDIO_JSON_DIAGNOSTICS = Object.freeze({
  validate: true,
  enableSchemaRequest: false,
  allowComments: false,
  trailingCommas: 'error',
  schemaValidation: 'error',
} as const);

const withoutUri = (schemas: readonly SchemaEntry[] | undefined, uri: string): SchemaEntry[] =>
  (schemas ?? []).filter((entry) => entry.uri !== uri);

/**
 * Adds `schema` for the model at `uri` — and only that model — keeping every other registered schema. Returns the
 * function that removes it again.
 */
export function registerMetaschema(
  defaults: JsonDefaults,
  uri: string,
  schema: object,
): () => void {
  const current = defaults.diagnosticsOptions;
  defaults.setDiagnosticsOptions({
    ...current,
    ...STUDIO_JSON_DIAGNOSTICS,
    schemas: [...withoutUri(current.schemas, uri), { uri, fileMatch: [uri], schema }],
  });
  return () => {
    const latest = defaults.diagnosticsOptions;
    defaults.setDiagnosticsOptions({ ...latest, schemas: withoutUri(latest.schemas, uri) });
  };
}
