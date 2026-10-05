import type { AuthoredColumnType } from '../ui/object-array';

/**
 * One change to an object array's columns (doc 263 rule 25), sent through the studio's `editColumns` port. Lives with
 * the renderers so they never import `studio/`; the host applies it with `applyColumnEdit`.
 */
export type ColumnEdit =
  | { kind: 'add' }
  | { kind: 'rename'; key: string; title: string }
  | { kind: 'retype'; key: string; type: AuthoredColumnType }
  | { kind: 'move'; key: string; to: number }
  | { kind: 'remove'; key: string }
  /** Changes a column's data key (doc 264 rule 9). */
  | { kind: 'rekey'; key: string; to: string }
  /** Replaces a choice column's options (doc 268 rule 5). */
  | { kind: 'options'; key: string; entries: readonly ColumnOptionEntry[] };

/** One saved option: the Options dialog's `SavedEntry`, restated so the renderers never import `studio/`. */
export interface ColumnOptionEntry {
  readonly const: string | number;
  readonly title?: string;
  readonly description?: string;
}
