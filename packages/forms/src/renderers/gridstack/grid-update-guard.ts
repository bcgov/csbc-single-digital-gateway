import { GridStack } from 'gridstack';

/** Marks the wrapped `GridStack.prototype.update`, so the guard is only ever installed once. */
export const GRID_UPDATE_GUARD = Symbol.for('@repo/forms/grid-update-guard');

type Update = GridStack['update'];
type GuardedUpdate = Update & { [GRID_UPDATE_GUARD]?: true };

/** `opt` without gridstack's runtime-only `_`-prefixed fields; anything else passes through as-is. */
function withoutRuntimeFields<T>(opt: T): T {
  if (typeof opt !== 'object' || opt === null || Array.isArray(opt)) return opt;
  if (!Object.keys(opt).some((key) => key.startsWith('_'))) return opt;
  return Object.fromEntries(Object.entries(opt).filter(([key]) => !key.startsWith('_'))) as T;
}

/**
 * Keeps drag-time node cycles out of `grid.update` (doc 183 rule 15b, bug B2).
 *
 * Mid-drag gridstack keeps `node._event` on the engine node — a copy of the event whose `target` is the
 * item element, whose `gridstackNode` is the node again — and `node._lastTried`. gridstack's React
 * wrapper renders synthetic items with the LIVE node as options and calls
 * `grid.update(node.el, { ...options, id })`, and `update` deep-clones its options with
 * `Utils.cloneDeep`, which does not skip `target`: an item re-rendering mid-drag (into a nested Grid
 * and back out) recursed until "Maximum call stack size exceeded". `update` never reads `_` fields, so
 * the wrapper hands it a shallow copy without them. The node itself is untouched. Idempotent.
 */
export function installGridUpdateGuard(): void {
  const original = GridStack.prototype.update as GuardedUpdate;
  if (original[GRID_UPDATE_GUARD]) return;

  const guarded: GuardedUpdate = function update(
    this: GridStack,
    els: Parameters<Update>[0],
    opt: Parameters<Update>[1],
  ): ReturnType<Update> {
    return original.call(this, els, withoutRuntimeFields(opt));
  };
  guarded[GRID_UPDATE_GUARD] = true;
  GridStack.prototype.update = guarded;
}
