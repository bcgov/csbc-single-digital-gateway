import type { Clause, Operator } from '@repo/forms';
import type { FieldKind } from '../criteria';

// Doc 256 rules 1-3 — a rule as the author edits it (effect, all/any, clauses) and as JSONForms stores it (a native
// `rule` of schema conditions). Pure. `readRule` recognises EXACTLY the shapes `compileRule` writes, so anything else
// is a custom rule the studio shows but never rewrites.

export const RULE_EFFECTS = ['SHOW', 'HIDE', 'ENABLE', 'DISABLE'] as const;
export type RuleEffect = (typeof RULE_EFFECTS)[number];

/** A rule as the dialog edits it. */
export interface RuleDraft {
  effect: RuleEffect;
  match: 'all' | 'any';
  clauses: Clause[];
}

/** A rule as JSONForms reads it: `{ effect, condition }`. */
export interface StoredRule {
  effect: RuleEffect;
  condition: Record<string, unknown>;
}

/** What a stored rule reads as: none, an editable draft, or a custom rule the studio will not rewrite. */
export type ReadRule =
  | { kind: 'none' }
  | { kind: 'draft'; draft: RuleDraft }
  | { kind: 'custom'; rule: Record<string, unknown> };

const PROPERTY_SCOPE = /^#\/properties\/([^/]+)$/;
/** Regex metacharacters, escaped in the author's text so a value can never be read as a pattern (Security). */
const META = /[.*+?^${}()|[\]\\/]/g;
const esc = (text: string) => text.replace(META, '\\$&');

/** A leaf's schema and whether an unanswered field fails it, for one clause (rule 2's table). */
function leafSchema(
  clause: Clause,
  kind: FieldKind,
): { schema: Record<string, unknown>; fail: boolean } {
  const v = clause.value;
  switch (clause.operator) {
    case 'equals':
      return { schema: { const: v }, fail: true };
    case 'notEquals':
      return { schema: { not: { const: v } }, fail: false };
    case 'contains':
      return { schema: { pattern: esc(String(v)) }, fail: true };
    case 'startsWith':
      return { schema: { pattern: `^${esc(String(v))}` }, fail: true };
    case 'endsWith':
      return { schema: { pattern: `${esc(String(v))}$` }, fail: true };
    case 'gt':
      return { schema: { exclusiveMinimum: v }, fail: true };
    case 'gte':
      return { schema: { minimum: v }, fail: true };
    case 'lt':
      return { schema: { exclusiveMaximum: v }, fail: true };
    case 'lte':
      return { schema: { maximum: v }, fail: true };
    case 'in':
      return { schema: { enum: v }, fail: true };
    case 'notIn':
      return { schema: { not: { enum: v } }, fail: false };
    case 'includes':
      return { schema: { contains: { const: v } }, fail: true };
    case 'notIncludes':
      return { schema: { not: { contains: { const: v } } }, fail: false };
    case 'isTrue':
      return { schema: { const: true }, fail: true };
    case 'isFalse':
      return { schema: { not: { const: true } }, fail: false };
    case 'isEmpty':
      return { schema: EMPTY[kind], fail: false };
    case 'isNotEmpty':
      return { schema: NOT_EMPTY[kind], fail: true };
    default:
      return { schema: {}, fail: false };
  }
}

/** "Is empty" per kind: an answered value that counts as empty; an unanswered field passes on its own. */
const EMPTY: Record<FieldKind, Record<string, unknown>> = {
  text: { const: '' },
  number: { not: {} },
  choice: { not: {} },
  multi: { maxItems: 0 },
  boolean: { not: {} },
};
const NOT_EMPTY: Record<FieldKind, Record<string, unknown>> = {
  text: { not: { const: '' } },
  number: {},
  choice: {},
  multi: { minItems: 1 },
  boolean: {},
};

/** One clause as a JSONForms schema condition on its field. */
function leafOf(clause: Clause, kinds: ReadonlyMap<string, FieldKind>): Record<string, unknown> {
  const { schema, fail } = leafSchema(clause, kinds.get(clause.field) ?? 'text');
  return {
    scope: `#/properties/${clause.field}`,
    schema,
    ...(fail && { failWhenUndefined: true }),
  };
}

/**
 * Rules 1-2: the draft as a native rule — one clause a leaf, several an AND / OR of leaves. `kinds` (field key → kind)
 * picks "is empty"'s encoding, the one operator whose schema depends on what the field holds.
 */
export function compileRule(draft: RuleDraft, kinds: ReadonlyMap<string, FieldKind>): StoredRule {
  const leaves = draft.clauses.map((clause) => leafOf(clause, kinds));
  const condition =
    leaves.length === 1
      ? leaves[0]!
      : { type: draft.match === 'any' ? 'OR' : 'AND', conditions: leaves };
  return { effect: draft.effect, condition };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const sameKeys = (record: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(record).length === keys.length && keys.every((key) => key in record);

/** The text of a pattern `esc` wrote, or `undefined` when it holds an unescaped metacharacter. */
function unescaped(pattern: string): string | undefined {
  let text = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i]!;
    if (char === '\\') {
      const next = pattern[i + 1];
      if (next === undefined || !/[.*+?^${}()|[\]\\/]/.test(next)) return undefined;
      text += next;
      i += 1;
    } else if (/[.*+?^${}()|[\]/]/.test(char)) return undefined;
    else text += char;
  }
  return text;
}

type Read = { operator: Operator; value?: Clause['value'] } | undefined;

/** The clause a leaf schema + fail flag stands for, by exact shape (rule 3), or `undefined`. */
function readSchema(schema: Record<string, unknown>, fail: boolean): Read {
  const keys = Object.keys(schema);
  if (keys.length === 0) return fail ? { operator: 'isNotEmpty' } : undefined;
  if (keys.length !== 1) return undefined;
  const [key] = keys as [string];
  const v = schema[key];
  const scalar = typeof v === 'string' || typeof v === 'number';
  const list = Array.isArray(v) && v.every((e) => typeof e === 'string' || typeof e === 'number');
  if (key === 'const') {
    if (v === true && fail) return { operator: 'isTrue' };
    if (v === '' && !fail) return { operator: 'isEmpty' };
    return scalar && fail ? { operator: 'equals', value: v } : undefined;
  }
  if (key === 'pattern' && typeof v === 'string' && fail) {
    const starts = v.startsWith('^');
    const ends = v.endsWith('$') && !v.endsWith('\\$');
    const text = unescaped(v.slice(starts ? 1 : 0, ends ? -1 : undefined));
    if (text === undefined || (starts && ends)) return undefined;
    return { operator: starts ? 'startsWith' : ends ? 'endsWith' : 'contains', value: text };
  }
  if (typeof v === 'number' && fail) {
    const bound: Record<string, Operator> = {
      exclusiveMinimum: 'gt',
      minimum: 'gte',
      exclusiveMaximum: 'lt',
      maximum: 'lte',
    };
    if (key in bound) return { operator: bound[key]!, value: v };
  }
  if (key === 'enum' && list && fail) return { operator: 'in', value: v };
  if (key === 'maxItems' && v === 0 && !fail) return { operator: 'isEmpty' };
  if (key === 'minItems' && v === 1 && fail) return { operator: 'isNotEmpty' };
  if (key === 'contains' && isRecord(v) && sameKeys(v, ['const']) && fail) {
    const c = v['const'];
    return typeof c === 'string' || typeof c === 'number'
      ? { operator: 'includes', value: c }
      : undefined;
  }
  if (key === 'not' && isRecord(v) && !fail) return readNot(v);
  return undefined;
}

/** The negated shapes: `{ not: … }` with no fail flag. */
function readNot(inner: Record<string, unknown>): Read {
  const keys = Object.keys(inner);
  if (keys.length === 0) return { operator: 'isEmpty' };
  if (keys.length !== 1) return undefined;
  const [key] = keys as [string];
  const v = inner[key];
  if (key === 'const') {
    if (v === true) return undefined; // `not const true` is isFalse — handled below with fail === false.
    return typeof v === 'string' || typeof v === 'number'
      ? v === ''
        ? undefined
        : { operator: 'notEquals', value: v }
      : undefined;
  }
  if (key === 'enum' && Array.isArray(v))
    return { operator: 'notIn', value: v as (string | number)[] };
  if (key === 'contains' && isRecord(v) && sameKeys(v, ['const'])) {
    const c = v['const'];
    return typeof c === 'string' || typeof c === 'number'
      ? { operator: 'notIncludes', value: c }
      : undefined;
  }
  return undefined;
}

/** The only keys a leaf `compileRule` writes may have. */
const LEAF_KEYS: ReadonlySet<string> = new Set(['scope', 'schema', 'failWhenUndefined']);

/** One leaf as a clause, or `undefined` when it is not a shape `compileRule` writes. */
function readLeaf(leaf: unknown, id: string): Clause | undefined {
  if (!isRecord(leaf)) return undefined;
  if (Object.keys(leaf).some((key) => !LEAF_KEYS.has(key))) return undefined;
  const key =
    typeof leaf['scope'] === 'string' ? PROPERTY_SCOPE.exec(leaf['scope'])?.[1] : undefined;
  const fail = leaf['failWhenUndefined'];
  if (key === undefined || !isRecord(leaf['schema']) || (fail !== undefined && fail !== true))
    return undefined;
  const schema = leaf['schema'];
  // `not const true` (isFalse) and `not const ''` (text isNotEmpty) differ only in the fail flag.
  if (sameKeys(schema, ['not']) && isRecord(schema['not']) && sameKeys(schema['not'], ['const'])) {
    const c = schema['not']['const'];
    if (c === true && fail === undefined) return { id, field: key, operator: 'isFalse' };
    if (c === '' && fail === true) return { id, field: key, operator: 'isNotEmpty' };
  }
  const read = readSchema(schema, fail === true);
  if (read === undefined) return undefined;
  return {
    id,
    field: key,
    operator: read.operator,
    ...(read.value !== undefined && { value: read.value }),
  };
}

/** Rule 3: a stored rule read back — none, a draft (new clause ids from `newId`), or custom. */
export function readRule(rule: unknown, newId: () => string): ReadRule {
  if (rule === undefined) return { kind: 'none' };
  if (!isRecord(rule)) return { kind: 'custom', rule: {} };
  const custom: ReadRule = { kind: 'custom', rule };
  const { effect, condition } = rule;
  if (
    !RULE_EFFECTS.includes(effect as RuleEffect) ||
    !sameKeys(rule, ['effect', 'condition']) ||
    !isRecord(condition)
  )
    return custom;
  const group = condition['type'];
  if (group === 'AND' || group === 'OR') {
    const leaves = condition['conditions'];
    if (!sameKeys(condition, ['type', 'conditions']) || !Array.isArray(leaves) || leaves.length < 2)
      return custom;
    const clauses = leaves.map((leaf) => readLeaf(leaf, newId()));
    if (clauses.some((clause) => clause === undefined)) return custom;
    return {
      kind: 'draft',
      draft: {
        effect: effect as RuleEffect,
        match: group === 'OR' ? 'any' : 'all',
        clauses: clauses as Clause[],
      },
    };
  }
  const clause = readLeaf(condition, newId());
  return clause === undefined
    ? custom
    : { kind: 'draft', draft: { effect: effect as RuleEffect, match: 'all', clauses: [clause] } };
}

/** Every top-level property key a stored rule's conditions test — of any rule, custom ones included (rule 5). */
export function ruleScopes(rule: unknown): string[] {
  const keys: string[] = [];
  const walk = (condition: unknown) => {
    if (!isRecord(condition)) return;
    if (Array.isArray(condition['conditions'])) condition['conditions'].forEach(walk);
    const scope = condition['scope'];
    if (typeof scope === 'string') {
      const key = PROPERTY_SCOPE.exec(scope)?.[1] ?? scope;
      if (!keys.includes(key)) keys.push(key);
    }
  };
  if (isRecord(rule)) walk(rule['condition']);
  return keys;
}
