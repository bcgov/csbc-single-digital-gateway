import { createContext, useContext } from 'react';

/** Doc 283: how blanks are read back — shown as "Not answered" (default), or hidden with their empty containers. */
export type Unanswered = 'show' | 'hide';

/** Set by `DocumentView`: the plain Funnel reads it to prune each Form on its path (doc 283 rule 10). */
export const PlainOptionsContext = createContext<{ unanswered: Unanswered }>({
  unanswered: 'show',
});

export function usePlainOptions(): { unanswered: Unanswered } {
  return useContext(PlainOptionsContext);
}

/** Rule 11: what a hidden-blanks view says when nothing is left — one wording, shared by the Form and Funnel paths. */
export const NOTHING_ANSWERED = 'Nothing has been answered yet.';
