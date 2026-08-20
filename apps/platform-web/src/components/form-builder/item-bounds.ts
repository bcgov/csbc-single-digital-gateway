import type { ControlNode } from './model';

/**
 * The two invariants governing an accordion field's item-count bounds (feature 171, revision 3).
 * Kept as pure functions so the inspector stays presentational and the rules are tested directly.
 *
 *  1. **A minimum of 1 or more implies the field is required.** "At least two answers" and "you may
 *     skip this" cannot both be true, so setting a minimum ticks Required, and clearing Required
 *     clears the minimum. The two controls can never end up contradicting each other.
 *  2. **The range is always satisfiable.** `maxItems < minItems` describes a field no value can
 *     satisfy, so the bound the author is NOT editing gives way — whatever they just typed is
 *     honoured, and the other end moves to meet it.
 */

/** Coerce inspector input to a non-negative integer; blank or junk reads as "unbounded". */
export function parseItemBound(raw: string): number | undefined {
  if (raw.trim() === '') {
    return undefined;
  }
  const value = Math.floor(Number(raw));
  return Number.isNaN(value) || value < 0 ? undefined : value;
}

/**
 * The patch for editing one bound, with both invariants applied. `edited` names the field the
 * author touched — it keeps its value, and the other end is the one that moves.
 */
export function applyItemBound(
  node: ControlNode,
  edited: 'minItems' | 'maxItems',
  value: number | undefined,
): Partial<ControlNode> {
  const patch: Partial<ControlNode> =
    edited === 'minItems'
      ? { minItems: value, maxItems: node.maxItems }
      : { minItems: node.minItems, maxItems: value };

  // Invariant 2 — the untouched end gives way so the range stays satisfiable.
  const min = patch.minItems;
  const max = patch.maxItems;
  if (min !== undefined && max !== undefined && max < min) {
    if (edited === 'minItems') {
      patch.maxItems = min;
    } else {
      patch.minItems = max;
    }
  }

  // Invariant 1 — a minimum of 1 or more means the field must be answered.
  if ((patch.minItems ?? 0) >= 1) {
    patch.required = true;
  }
  return patch;
}

/**
 * The patch for toggling Required. Turning it OFF clears the minimum — the other half of invariant
 * 1, without which an optional field could still demand three items.
 */
export function applyRequiredToggle(required: boolean): Partial<ControlNode> {
  return required ? { required: true } : { required: false, minItems: undefined };
}
