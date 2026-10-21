import { createContext } from 'react';

/**
 * The DOM ids a host asked for on Sections, by element `id` — what lets a page link to a Section ("On this page").
 * Empty everywhere but a `DocumentView` given `anchorSections`. Its own module, like `section-depth.ts`.
 */
export const SectionAnchorsContext = createContext<ReadonlyMap<string, string>>(new Map());
