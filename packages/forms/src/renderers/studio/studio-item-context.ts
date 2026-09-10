import { createContext } from 'react';

/**
 * `true` inside a studio grid item (doc 180 rules 16b, 17b). The item already draws the border and
 * caption, so `withStudioFrame` renders the bare renderer there rather than a second frame.
 *
 * Kept in its own module: a file exporting both a context and a component cannot be Fast Refreshed
 * (the same reason as gridstack/grid-context.ts).
 */
export const StudioItemContext = createContext(false);
