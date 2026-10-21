import { createContext } from 'react';

/**
 * How many Sections enclose an element — `0` outside any (doc 278 rule 7). Its own context, since the nearest layout
 * cannot answer it: a Section in a VerticalLayout in a Section is still two deep. Its own module, so `section-model.ts`
 * stays React-free for the inspector.
 */
export const SectionDepthContext = createContext(0);
