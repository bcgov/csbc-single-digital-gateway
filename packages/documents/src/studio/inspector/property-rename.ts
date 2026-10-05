import type { DocumentContent, Uischema } from '../document-types';
import { conditionsOf, withFunnel, type FunnelCondition } from '../funnel-model';
import { ownerOf, propertyAt, scopeOf, withOwner } from '../property-ref';
import { recordOf } from './inspector-target';

/** The nanoid alphabet: every generated key is already valid (doc 257 rule 10). */
const KEY_ALPHABET = /^[A-Za-z0-9_-]+$/;

/**
 * Why `to` cannot replace `from` (rule 10), or `undefined` when it can — including when it is unchanged. A record
 * item field (`array` given, doc 271 rule 16) must be unique among its array's `items.properties` instead.
 */
export function keyProblem(
  content: DocumentContent,
  from: string,
  to: string,
  array?: string,
): string | undefined {
  const key = to.trim();
  if (key === '') return 'A key is required.';
  if (!KEY_ALPHABET.test(key)) return 'Use letters, numbers, _ or -.';
  if (key === '__proto__') return `${key} is reserved.`;
  const owner =
    array === undefined ? content.schema : ownerOf(content.schema, { array, key: from });
  if (key !== from && Object.hasOwn(recordOf(owner?.['properties']) ?? {}, key))
    return `${key} is already used.`;
  return undefined;
}

/**
 * `content` with the property `from` renamed to `to` everywhere it is referenced (rules 13-15): the property in
 * place, `required`, Control scopes and rule condition scopes in every variant, and Funnel clause fields — in ONE
 * content. The SAME content when the rename is unchanged, unknown or invalid; untouched subtrees keep their identity.
 */
export function renamePropertyKey(
  content: DocumentContent,
  from: string,
  to: string,
  array?: string,
): DocumentContent {
  if (array !== undefined) return renameItemKey(content, array, from, to);
  const key = to.trim();
  const properties = recordOf(content.schema['properties']);
  if (key === from || properties === undefined || !Object.hasOwn(properties, from)) return content;
  if (keyProblem(content, from, key) !== undefined) return content;
  const variants = Object.fromEntries(
    Object.entries(content.variants).map(([name, uischema]) => [
      name,
      renameInRoot(uischema, from, key),
    ]),
  ) as DocumentContent['variants'];
  // Spread, so a key this does not know about (doc 258's `capabilities`) survives the rename.
  return { ...content, schema: renameInSchema(content.schema, properties, from, key), variants };
}

function renameInSchema(
  schema: Record<string, unknown>,
  properties: Record<string, unknown>,
  from: string,
  to: string,
): Record<string, unknown> {
  // Rebuilt in order (rule 13a): the dirty check compares JSON text, so a moved key would read as a change.
  const renamed = Object.fromEntries(
    Object.entries(properties).map(([name, value]) => [name === from ? to : name, value]),
  );
  const required = schema['required'];
  return {
    ...schema,
    properties: renamed,
    ...(Array.isArray(required) &&
      required.includes(from) && {
        required: required.map((entry: unknown) => (entry === from ? to : entry)),
      }),
  };
}

/** A scope naming `from` itself or something inside it, rewritten to `to`; otherwise the same string. */
function renamedScope(scope: string, from: string, to: string): string {
  const prefix = `#/properties/${from}`;
  if (scope === prefix) return `#/properties/${to}`;
  return scope.startsWith(`${prefix}/`) ? `#/properties/${to}${scope.slice(prefix.length)}` : scope;
}

/** A variant root: its elements, then — on a Funnel — its Condition clauses (rule 13e). */
function renameInRoot(root: Uischema, from: string, to: string): Uischema {
  const next = renameInElement(root, from, to);
  const conditions = conditionsOf(next);
  const renamed = conditions.map((condition) => renameInCondition(condition, from, to));
  return renamed.some((condition, index) => condition !== conditions[index])
    ? withFunnel(next, { conditions: renamed })
    : next;
}

/** An element with its Control scope, its rule and its children renamed (rules 13c-d). */
function renameInElement(element: Uischema, from: string, to: string): Uischema {
  const patch: Record<string, unknown> = {};
  const scope = element['scope'];
  if (element['type'] === 'Control' && typeof scope === 'string') {
    const next = renamedScope(scope, from, to);
    if (next !== scope) patch['scope'] = next;
  }
  const rule = recordOf(element['rule']);
  if (rule !== undefined) {
    const condition = renameInRuleCondition(rule['condition'], from, to);
    if (condition !== rule['condition']) patch['rule'] = { ...rule, condition };
  }
  const elements = element['elements'];
  if (Array.isArray(elements)) {
    const children = elements.map((child: unknown) => {
      const record = recordOf(child);
      return record === undefined ? child : renameInElement(record, from, to);
    });
    if (children.some((child, index) => child !== elements[index])) patch['elements'] = children;
  }
  return Object.keys(patch).length === 0 ? element : { ...element, ...patch };
}

/** A rule condition with every leaf `scope` renamed, nested `conditions` included — its shape never changes. */
function renameInRuleCondition(condition: unknown, from: string, to: string): unknown {
  const record = recordOf(condition);
  if (record === undefined) return condition;
  const patch: Record<string, unknown> = {};
  const scope = record['scope'];
  if (typeof scope === 'string') {
    const next = renamedScope(scope, from, to);
    if (next !== scope) patch['scope'] = next;
  }
  const nested = record['conditions'];
  if (Array.isArray(nested)) {
    const next = nested.map((child: unknown) => renameInRuleCondition(child, from, to));
    if (next.some((child, index) => child !== nested[index])) patch['conditions'] = next;
  }
  return Object.keys(patch).length === 0 ? condition : { ...record, ...patch };
}

/** A Condition with every clause on `from` pointed at `to`; values are untouched. */
function renameInCondition(condition: FunnelCondition, from: string, to: string): FunnelCondition {
  let changed = false;
  const rows = condition.options.rows.map((row) => {
    if (!row.clauses.some((clause) => clause.field === from)) return row;
    changed = true;
    return {
      ...row,
      clauses: row.clauses.map((clause) =>
        clause.field === from ? { ...clause, field: to } : clause,
      ),
    };
  });
  return changed ? { ...condition, options: { ...condition.options, rows } } : condition;
}

/**
 * Doc 271 rule 16: a record item field's key renamed — in its array's `items.properties` (order kept) and
 * `items.required`, and every Control bound to its full scope in every variant. Item fields are never rule or
 * Condition sources, so nothing else names them. The SAME content when unchanged, unknown or invalid.
 */
function renameItemKey(
  content: DocumentContent,
  array: string,
  from: string,
  to: string,
): DocumentContent {
  const key = to.trim();
  const ref = { array, key: from };
  if (key === from || propertyAt(content.schema, ref) === undefined) return content;
  if (keyProblem(content, from, key, array) !== undefined) return content;
  const schema = withOwner(content.schema, ref, (owner) =>
    renameInSchema(owner, recordOf(owner['properties'])!, from, key),
  );
  const [oldScope, newScope] = [scopeOf(ref), scopeOf({ array, key })];
  const variants = Object.fromEntries(
    Object.entries(content.variants).map(([name, root]) => [
      name,
      rescoped(root, oldScope, newScope),
    ]),
  ) as DocumentContent['variants'];
  return { ...content, schema, variants };
}

/** `node` with every Control scoped `from` rescoped `to`, at any depth; the same object when none is. */
export function rescoped(node: Uischema, from: string, to: string): Uischema {
  const own = node['type'] === 'Control' && node['scope'] === from ? { ...node, scope: to } : node;
  const elements = own['elements'];
  if (!Array.isArray(elements)) return own;
  const children = elements.map((child: unknown) => {
    const record = recordOf(child);
    return record === undefined ? child : rescoped(record, from, to);
  });
  return children.some((child, i) => child !== elements[i]) ? { ...own, elements: children } : own;
}
