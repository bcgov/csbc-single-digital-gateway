import { Button } from '@repo/ui/button';
import {
  COLLAPSED_LAYOUT,
  OPEN_LAYOUT,
  STAGE_BORDER,
  STAGE_ROW,
  STAGE_TEXT,
  STEP_NUMBER,
} from './runner-row-parts';

/**
 * Doc 202 rule 48b: what the review step is called wherever it is listed.
 *
 * It lives HERE, not beside the page it names: `runner-review.tsx` imports the whole default renderer set, and
 * the rail importing it for one string closed a cycle — `renderers/default` → the runner → the rail → the
 * review page → `renderers/default` — which left `controlRenderers` undefined at module init. A constant in a
 * leaf module cannot do that.
 */
export const REVIEW_STEP_LABEL = 'Review';

/**
 * Doc 202 rule 48b: the review page's own row, last in the rail.
 *
 * It wears the SAME chrome as a Stage row — the left rule, the numeral, the caption, the reached/ahead tones —
 * because to a citizen it is another step: somewhere they arrive at, can return to, and can see coming. Giving
 * it a look of its own would say it is a different KIND of thing, which it is not; that is why the chrome moved
 * into `runner-row-parts.tsx` rather than being copied.
 *
 * It holds no Forms, so it never carries an error flag: rule 52 leaves Submit's gate where it was, and an error
 * surfaced on the review page belongs to the Form that owns it, whose own row is already flagged.
 */
export function ReviewRow({
  label,
  index,
  open,
  current,
  locked,
  onOpen,
}: {
  readonly label: string;
  /** Its place in the rail — after the last Stage, so the numbering continues rather than restarting. */
  readonly index: number;
  readonly open: boolean;
  readonly current: boolean;
  /** Rule 48b: the review sits after the last Form, so it opens exactly when that Form does. */
  readonly locked: boolean;
  onOpen(): void;
}) {
  const tone = current ? 'reached' : 'ahead';

  return (
    <li data-slot="runner-review-step" {...(current ? { 'data-current': '' } : {})}>
      <Button
        type="button"
        variant="ghost"
        disabled={locked}
        // `disabled` already conveys it to assistive tech; `aria-disabled` makes the state explicit for tests.
        {...(locked ? { 'aria-disabled': true } : {})}
        {...(current ? { 'aria-current': 'step' as const } : {})}
        // Collapsed, the name is not rendered, so the button needs an accessible name of its own.
        {...(open ? {} : { 'aria-label': `Step ${index + 1}: ${label}` })}
        onClick={onOpen}
        className={`${STAGE_ROW} ${open ? OPEN_LAYOUT : COLLAPSED_LAYOUT} ${STAGE_BORDER[tone]}${
          current ? ' bg-accent hover:bg-accent' : ''
        }`}
      >
        {open ? (
          <span
            data-slot="runner-step-caption"
            className={`col-start-2 text-xs font-normal ${STAGE_TEXT[tone]}`}
          >
            Step {index + 1}
          </span>
        ) : null}
        <span
          data-slot="runner-step-number"
          className={`${STEP_NUMBER} col-start-1 row-start-2 ${STAGE_TEXT[tone]}`}
        >
          {index + 1}
        </span>
        {open ? (
          <span
            data-slot="runner-stage-name"
            className={`col-start-2 row-start-2 truncate font-bold ${STAGE_TEXT[tone]}`}
          >
            {label}
          </span>
        ) : null}
        {/* Rule 25b's wording, so a locked review reads like any other step still ahead. */}
        {locked ? <span className="sr-only">upcoming</span> : null}
      </Button>
    </li>
  );
}
