import { createContext } from 'react';

/**
 * Whether the Grid an element sits DIRECTLY in has no free cell, so its copy has nowhere to go (doc 260 rule 22). Every
 * studio layout provides its own value, so a nested layout's children never read an outer Grid's.
 */
export const ParentGridFullContext = createContext(false);

/** Why Copy is disabled in a full Grid (doc 260 rule 22). */
export const NO_FREE_CELL = 'No free cell in the grid';
