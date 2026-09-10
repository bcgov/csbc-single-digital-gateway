/** Studio-only element ids (doc 183 rules 5-6). */
export interface ElementIds {
  /** The id of `element`, assigning `<prefix>-<n>` on first sight. */
  idOf(element: object): string;
  /** Gives `to` the id of `from` — call for every element an immutable update replaces. */
  carry(from: object, to: object): void;
  /** Forgets every id and restarts the counter (a new document was loaded). */
  clear(): void;
}

/**
 * Element ids kept beside the uischema, never in it: a `WeakMap` from element object to id. Updates
 * return new element objects, so whoever replaces an element carries its id across.
 */
export function createElementIds(prefix = 'el'): ElementIds {
  let ids = new WeakMap<object, string>();
  let counter = 0;

  const idOf = (element: object): string => {
    const existing = ids.get(element);
    if (existing !== undefined) return existing;
    counter += 1;
    const id = `${prefix}-${counter}`;
    ids.set(element, id);
    return id;
  };

  return {
    idOf,
    carry: (from, to) => {
      ids.set(to, idOf(from));
    },
    clear: () => {
      ids = new WeakMap();
      counter = 0;
    },
  };
}
