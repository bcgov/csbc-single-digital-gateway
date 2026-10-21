import { createContext } from 'react';

/** Which slot of a Card a dispatched VerticalLayout is (doc 273 rule 7). */
export type CardSlotRole = 'content' | 'footer';

/**
 * Set by the studio Card around each slot it dispatches and read by the slot's StudioElement, which withholds Copy
 * from both slots and Delete from the content slot. StudioElement resets it for its children, so it never reaches the
 * slot's own elements.
 */
export const CardSlotContext = createContext<CardSlotRole | null>(null);
