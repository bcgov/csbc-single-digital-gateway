import { NOTHING_ANSWERED } from './plain-options';

/** Doc 283 rule 11: a hidden-blanks view with nothing left says so, rather than showing an empty page. */
export function NothingAnswered() {
  return (
    <p data-slot="document-view-empty" className="px-6 py-8 text-sm text-muted-foreground">
      {NOTHING_ANSWERED}
    </p>
  );
}
