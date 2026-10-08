import { mdiEyeOffOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { createContext, useContext, type ReactNode } from 'react';
import { hideLabel } from './hide-label';

// Doc 285: a Control's `options.hideLabel` hides its label VISUALLY — the label element stays, with every id and
// `htmlFor` it had, so it is still the control's accessible name. The studio canvas marks it instead of hiding it.
// Whether it is hidden is decided by the pure `hide-label.ts`.

/** Rule 9: how a hidden label is drawn — `hide` (every form, preview and read-back) or `dim` (the studio canvas). */
export type LabelPresentation = 'hide' | 'dim';

export const LabelPresentationContext = createContext<LabelPresentation>('hide');

/** What a label site adds to its label element, and what it draws after the label text. */
export interface HiddenLabel {
  readonly hidden: boolean;
  /** Spread onto the label element: nothing when shown. */
  readonly labelProps: { className?: string; 'data-label-hidden'?: '' };
  /** Drawn inside the label after its text: the canvas's eye-off icon, else nothing. */
  readonly marker: ReactNode;
}

const SHOWN: HiddenLabel = Object.freeze({ hidden: false, labelProps: {}, marker: null });

/**
 * Rules 2, 9: a hidden label is `sr-only`; on the canvas it stays visible, muted, with an eye-off icon that is never
 * part of the accessible name. A hook — call it before a renderer's early `visible` return.
 */
export function useHiddenLabel(uischema: unknown): HiddenLabel {
  const presentation = useContext(LabelPresentationContext);
  if (!hideLabel(uischema)) return SHOWN;
  if (presentation === 'hide')
    return {
      hidden: true,
      labelProps: { className: 'sr-only', 'data-label-hidden': '' },
      marker: null,
    };
  return {
    hidden: true,
    labelProps: { className: 'text-muted-foreground', 'data-label-hidden': '' },
    marker: (
      // `aria-hidden` on the span, not just the icon: accname reads a childless node's `title`, so the tooltip would
      // otherwise join the label's accessible name.
      <span
        data-slot="hidden-label-marker"
        title="Label hidden in the form"
        aria-hidden="true"
        className="ml-1 inline-flex align-middle"
      >
        <Icon path={mdiEyeOffOutline} size="1em" />
      </span>
    ),
  };
}
