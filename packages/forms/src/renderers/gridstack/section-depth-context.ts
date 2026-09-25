import { createContext } from 'react';

/**
 * Doc 212 rule 10: how many Sections deep the children of this element are — `0` outside any Section.
 *
 * Its OWN context, not `LayoutNestingContext`: that one carries the nearest layout's KIND (doc 194 rule 1) and
 * cannot answer this, because a Section inside a VerticalLayout inside a Section is still two Sections deep
 * while its nearest layout kind is just `vertical`.
 *
 * Doc 222: split out of `section-options.ts` so that module stays free of React. The inspector's field
 * definitions read `sectionInset` / `sectionHeadingLevel`, and the capability validator reads the inspector's
 * field definitions inside platform-api — one `createContext` import would drag React into the Nest process.
 */
export const SectionDepthContext = createContext(0);
