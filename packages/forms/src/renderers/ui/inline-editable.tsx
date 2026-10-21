import { createContext, useContext } from 'react';
import type { InlineEditable } from '../../types/elements';

/**
 * Doc 223: how a canvas value becomes editable in place — reached by every renderer that draws one.
 *
 * A CONTEXT rather than a prop threaded through the renderer sets, because the surfaces are spread
 * across three directories (`renderers/ui`'s Heading and RichContent, `renderers/gridstack`'s title
 * blocks and Section) and none of them may import `renderers/studio`, where the implementation lives
 * — `form-errors.test.ts` pins that the dependency only runs downward. A context lets the studio
 * supply it once, at the canvas root, without anyone importing upward.
 *
 * The default renders the read view untouched, so every renderer behaves exactly as it always has
 * outside the studio — which is what lets one renderer serve both the canvas and a citizen's form.
 */
const InlineEditableContext = createContext<InlineEditable>(({ children }) => children);

export const InlineEditableProvider = InlineEditableContext.Provider;

/** The inline editor in scope, or the read-only passthrough outside the studio canvas. */
export function useInlineEditable(): InlineEditable {
  return useContext(InlineEditableContext);
}
