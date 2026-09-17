import { useEffect, useState, type RefObject } from 'react';

// Where a Condition's outputs sit down the card (doc 199 rule 43, amended 2026-09-17).
//
// They are MEASURED, not computed from constants. The first build offset each handle by a fixed header height
// plus a fixed row height, which is a guess about padding, font size and line height in three different files —
// it drifts the moment any of them changes, and a handle that is a few pixels off its row is exactly the defect
// the rule exists to prevent. Measuring asks the DOM where the row actually is.

/** The centre of each row of the card, in pixels from its top — rows in order, then the Else row. */
export type OutputOffsets = readonly number[];

const ROW_SELECTOR = '[data-slot="condition-criterion-row"]';
const ELSE_SELECTOR = '[data-slot="condition-default-row"]';

/** The centre of `element` relative to `top`, or `undefined` when nothing has been laid out yet. */
function centreOf(element: Element, top: number): number | undefined {
  const box = element.getBoundingClientRect();
  return box.height === 0 ? undefined : box.top - top + box.height / 2;
}

/**
 * The vertical centre of every output row inside `cardRef`, re-measured whenever the card resizes.
 *
 * Returns `[]` until the card has real boxes — in jsdom every rect is 0×0, and during the first paint the node
 * is not measured yet — and the caller then falls back to spreading the handles evenly. A partly-measured card
 * is treated as unmeasured for the same reason: half-aligned handles read as a bug, evenly spread ones read as
 * the layout simply not having settled.
 *
 * `deps` is what should force a re-measure beyond a resize — the element whose rows these are. A row added or
 * removed changes the card's height, so the observer catches it too, but a row RENAMED to a shorter label does
 * not, and its row can still change height by losing a line.
 */
export function useOutputOffsets(
  cardRef: RefObject<HTMLElement | null>,
  deps: unknown,
): OutputOffsets {
  const [offsets, setOffsets] = useState<OutputOffsets>([]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const measure = () => {
      const top = card.getBoundingClientRect().top;
      const rows = [
        ...card.querySelectorAll(ROW_SELECTOR),
        ...card.querySelectorAll(ELSE_SELECTOR),
      ];
      const measured = rows.map((row) => centreOf(row, top));
      setOffsets((current) => {
        const next = measured.every((offset) => offset !== undefined) ? (measured as number[]) : [];
        // A new array every measure would re-render the node on every resize tick, and each re-render asks
        // xyflow to update the node's internals (the caller's effect), which is not free.
        return current.length === next.length && current.every((value, i) => value === next[i])
          ? current
          : next;
      });
    };

    measure();
    // jsdom has no ResizeObserver of its own; the package's test setup stubs one, and `test/xyflow-jsdom.ts`
    // replaces it with one reporting only `.react-flow`. Neither reports this card, which is why the fallback
    // above has to stand on its own.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, [cardRef, deps]);

  return offsets;
}
