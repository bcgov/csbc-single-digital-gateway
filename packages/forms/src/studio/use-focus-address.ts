import type { UISchemaElement } from '@jsonforms/core';
import { useEffect, useRef } from 'react';
import type { ElementIds } from './layout/element-ids';
import { addressOf, resolveAddress } from './layout/form-address';

/** How the studio reports where focus actually is (doc 197 rule 7). */
export type FocusAddressChange = (formId: string | null, meta: { replace: boolean }) => void;

interface FocusAddressOptions {
  readonly uischema: UISchemaElement;
  readonly ids: ElementIds;
  /** The studio id of the Form the canvas shows (doc 196 rule 12), or `null`. */
  readonly focusId: string | null;
  /** The address the host wants focused; `undefined` when the host does not drive focus. */
  readonly focusedForm?: string | null | undefined;
  readonly onFocusedFormChange?: FocusAddressChange | undefined;
  readonly select: (elementId: string | null) => void;
  /** Replaced when a new seed document resets the studio, and with it the element ids. */
  readonly seed: object;
}

/** No value has been exchanged with the host yet — distinct from the host asking for `null`. */
const UNSET = Symbol('unset');

/**
 * Doc 197 rules 8-13: keeps the host's address and the studio's focus in step, in both directions.
 *
 * Focus itself stays derived from the selection (doc 196 rule 12), so this hook never holds it: it reads the address of
 * the focused Form and writes through `select`. With neither prop passed it does nothing at all, so a host that does
 * not opt in behaves exactly as before (rule 8).
 *
 * The two directions cannot loop (rule 12): the address last exchanged with the host is remembered, so applying what
 * the host asked for is never reported straight back, and a re-render with unchanged focus reports nothing. An address
 * that does not resolve — unknown, or named while the root is a Form — is corrected with `replace: true` rather than
 * left to lie in the address bar (rule 11), as is an address whose Form has since been deleted. A new seed document
 * re-applies the host's address against the new document (rule 13).
 */
export function useFocusAddress({
  uischema,
  ids,
  focusId,
  focusedForm,
  onFocusedFormChange,
  select,
  seed,
}: FocusAddressOptions): void {
  const address = addressOf(uischema, focusId, ids);
  const exchanged = useRef<string | null | typeof UNSET>(UNSET);
  const lastSeed = useRef(seed);
  // Read through a ref so a host passing a fresh arrow function every render does not re-run the effect.
  const latest = useRef({ uischema, ids, select, onFocusedFormChange });
  latest.current = { uischema, ids, select, onFocusedFormChange };

  useEffect(() => {
    if (focusedForm === undefined && onFocusedFormChange === undefined) return;
    const current = latest.current;
    const report = (formId: string | null, replace: boolean) => {
      exchanged.current = formId;
      current.onFocusedFormChange?.(formId, { replace });
    };

    // Rule 13: a new document restarts the element ids, so the host's address is resolved against it afresh.
    if (lastSeed.current !== seed) {
      lastSeed.current = seed;
      exchanged.current = UNSET;
    }

    // Rule 10: the first run adopts whatever is already in effect. Mounting is not a focus change, so a host that only
    // listens hears nothing until the author actually moves. A host that also drives focus falls through to rule 9.
    if (exchanged.current === UNSET && focusedForm === undefined) {
      exchanged.current = address;
      return;
    }

    const wanted = focusedForm ?? null;
    if (focusedForm !== undefined && wanted !== exchanged.current) {
      // Rule 9: the host moved focus.
      if (wanted === null) {
        exchanged.current = null;
        if (focusId !== null) current.select(null);
        return;
      }
      const resolved = resolveAddress(current.uischema, wanted, current.ids);
      if (resolved !== null) {
        exchanged.current = wanted;
        current.select(resolved);
        return;
      }
      // Rule 11: nothing to focus — say what is actually in effect instead of leaving the address bar wrong.
      report(address, true);
      return;
    }

    // Rule 10: the studio moved focus (drilling in, Back, Escape, a breadcrumb, a delete).
    if (address !== exchanged.current) {
      const stale =
        address === null &&
        typeof wanted === 'string' &&
        resolveAddress(current.uischema, wanted, current.ids) === null;
      report(address, stale);
    }
  }, [focusedForm, onFocusedFormChange, address, focusId, seed]);
}
