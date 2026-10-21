import type { Uischema } from '../document-types';

import { STUDIO_RULE } from '../../renderers/studio/rule-badge';

/**
 * `form` with every element's `rule` moved to `x-studio-rule`, at any depth: the canvas renders with no answers, so a
 * rule left in place would hide or disable the very element being authored. The badge reads the moved rule. The SAME
 * object when no element has a rule.
 */
export function stripRules(form: Uischema): Uischema {
  const { rule, ...rest } = form;
  const elements = form['elements'];
  const children = Array.isArray(elements)
    ? elements.map((child: unknown) =>
        typeof child === 'object' && child !== null && !Array.isArray(child)
          ? stripRules(child as Uischema)
          : child,
      )
    : undefined;
  const childrenChanged =
    children !== undefined && children.some((child, i) => child !== (elements as unknown[])[i]);
  if (rule === undefined && !childrenChanged) return form;
  return {
    ...rest,
    ...(rule !== undefined && { [STUDIO_RULE]: rule }),
    ...(childrenChanged && { elements: children }),
  };
}

/**
 * `element` with every `x-studio-rule` put back as `rule`, at any depth — the inverse of `stripRules`. The canvas's
 * reorder writes a layout's `elements` back from the grid, which holds the STRIPPED copies; without this every drag
 * deleted the rules it moved (doc 256 bug). The SAME object when nothing was moved aside.
 */
export function restoreRules<T>(element: T): T {
  if (typeof element !== 'object' || element === null || Array.isArray(element)) return element;
  const record = element as Record<string, unknown>;
  const { [STUDIO_RULE]: moved, ...rest } = record;
  const elements = record['elements'];
  const children = Array.isArray(elements) ? elements.map(restoreRules) : undefined;
  const childrenChanged =
    children !== undefined && children.some((child, i) => child !== (elements as unknown[])[i]);
  if (moved === undefined && !childrenChanged) return element;
  return {
    ...rest,
    ...(moved !== undefined && { rule: moved }),
    ...(childrenChanged && { elements: children }),
  } as T;
}
