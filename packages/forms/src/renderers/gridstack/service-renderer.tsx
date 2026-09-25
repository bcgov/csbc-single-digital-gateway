import { SERVICE_TITLE_PLACEHOLDER } from './element-placeholders';
import { createStudioTitle, FillFormTitle } from './form-renderer';

/**
 * Doc 215 rules 7, 10: everything that differs between a Service and a Form. The renderer itself is
 * `createFormRenderer` — there is no second implementation of the boundary to drift.
 */

/** Doc 215 rule 10: what a Service shows in place of its elements inside a layout. */
export const NESTED_SERVICE_MESSAGE = 'A Service can only be the root element.';

// Doc 222: declared in a React-free module; re-exported here, where it is drawn.
export { SERVICE_TITLE_PLACEHOLDER } from './element-placeholders';

/** Doc 215 rule 8: the studio title block of a Service — a Form's, with its own placeholder. */
export const StudioServiceTitle = createStudioTitle(SERVICE_TITLE_PLACEHOLDER);

/**
 * Doc 215 rule 9: the fillable title bar of a Service. IDENTICAL to a Form's — doc 201 rule 10 renders no text for an
 * empty title, since a citizen has no placeholder to fill in, so the one thing that differs in the studio does not
 * exist here. Re-exported under its own name so the fill registry reads by element, not by accident.
 */
export const FillServiceTitle = FillFormTitle;
