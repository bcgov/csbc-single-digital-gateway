// Editor text for one half of the studio document (doc 191 rules 15-16a).

/** Something wrong with a pane's text: a JSON pointer into the value (`''` for the whole text) and a message. */
export interface DocumentProblem {
  readonly path: string;
  readonly message: string;
}

export type ParsedText =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly problem: DocumentProblem };

/** The text an editor shows for `value`: two-space indented JSON. */
export const documentText = (value: unknown): string => JSON.stringify(value, null, 2);

/** Whether two JSON values serialise identically (doc 191 rules 17, 22 — the doc 177 comparison idiom). */
export const sameJson = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/** Strict JSON only — no comments or trailing commas, matching the editor's diagnostics (rule 8). */
export function parseDocumentText(text: string): ParsedText {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, problem: { path: '', message: `Invalid JSON: ${reason}` } };
  }
}
