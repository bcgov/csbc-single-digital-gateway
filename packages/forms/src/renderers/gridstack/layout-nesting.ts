import { createContext } from 'react';

/**
 * `true` below any layout renderer — a gridstack layout in the studio or a fillable CSS layout (doc 193 rule 10). The
 * Form renderer reads it to tell a root Form from a nested one (doc 192 rule 5); a tester cannot see an element's depth.
 *
 * Kept in its own module: a file exporting both a context and a component cannot be Fast Refreshed.
 */
export const LayoutNestingContext = createContext(false);
