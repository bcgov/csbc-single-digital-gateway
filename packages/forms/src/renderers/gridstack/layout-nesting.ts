import { createContext } from 'react';
import type { GridLayoutKind } from './grid-layouts';

/**
 * The kind of the nearest enclosing layout renderer — a gridstack layout in the studio or a fillable CSS layout — or
 * `null` outside every layout (doc 193 rule 10, doc 194 rule 6). Testers cannot see an element's parent, so renderers
 * read it: a Form is nested when it is set (doc 192 rule 5), and a Separator renders nothing in a row (doc 194 rule 3).
 *
 * Kept in its own module: a file exporting both a context and a component cannot be Fast Refreshed.
 */
export const LayoutNestingContext = createContext<GridLayoutKind | null>(null);
