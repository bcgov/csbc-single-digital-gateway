import { createContext } from 'react';

/**
 * Why the layout an element sits DIRECTLY in has no room for its copy — a full Grid (doc 260 rule 22) or row (doc 261
 * rule 18) — or `null` when it has. Every studio layout provides its own value, so a nested layout's children never read
 * an outer one's.
 */
export const ParentGridFullContext = createContext<string | null>(null);

/** Why Copy is disabled in a full Grid (doc 260 rule 22). */
export const NO_FREE_CELL = 'No free cell in the grid';

/** Why Copy is disabled in a full row (doc 261 rule 18). */
export const NO_ROOM_IN_ROW = 'No room in the row';
