import { mdiClose, mdiDotsHorizontal, mdiPlay } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import type { FC } from 'react';
import type { PreviewableStage } from './preview-forms';

// The header's preview control (doc 184 rules 1-4, as amended by rules 19-21).

/**
 * Rule 19: entering and leaving preview are two DIFFERENT actions, so they are two labelled buttons rather than one
 * toggle whose pressed state was the only cue. Both use the support-surface tokens — green to go in, red to come out —
 * the same soft treatment `Button`'s `destructive` variant uses, so the text stays near-black and legible.
 */
/** Rule 19b: the dock toggles' 24px height, so the header reads as one row of controls (doc 181 rule 17). */
// Rule 19d: no border at all (user decision) — `Button`'s own is transparent, and the split pair shows no divider.
const BUTTON_CLASS = 'h-6 gap-1 border-0 px-2 text-xs font-semibold text-white';
/**
 * Rule 19c: SATURATED fills, not the pale support surfaces — the control is the header's one coloured thing, and it
 * says which way it takes you. Green (`--color-icon-success`, #42814a) to go in, the design system's danger button red
 * (`--color-destructive`, #ce3e39) to come out — the BC Gov palette's own green and red (user decision), with a play
 * icon going in and a close icon coming out.
 */
const ENTER_CLASS = `${BUTTON_CLASS} bg-icon-success hover:bg-icon-success/90`;
const EXIT_CLASS = `${BUTTON_CLASS} bg-destructive hover:bg-danger-hover`;
/** Rule 19b: the menu trigger is ATTACHED to the Preview button — one split control in the same green. */
const ENTER_ATTACHED_CLASS = 'rounded-r-none';
const TRIGGER_CLASS =
  'inline-flex h-6 items-center justify-center rounded-md rounded-l-none border-0 bg-icon-success px-1 text-white hover:bg-icon-success/90 aria-expanded:bg-icon-success/90';

export interface PreviewControlProps {
  readonly previewing: boolean;
  /** Rules 20, 20c: the Forms this document can preview one at a time, by Stage — empty for a `Form` document. */
  readonly stages: readonly PreviewableStage[];
  onPreview(): void;
  onExit(): void;
  /** Rule 20: preview one Form of a multi-stage document. */
  onPreviewForm(id: string): void;
}

export const PreviewControl: FC<PreviewControlProps> = ({
  previewing,
  stages,
  onPreview,
  onExit,
  onPreviewForm,
}) => {
  if (previewing) {
    return (
      <Button size="sm" data-slot="preview-exit" className={EXIT_CLASS} onClick={onExit}>
        <Icon path={mdiClose} size="14px" />
        Exit preview
      </Button>
    );
  }
  const split = stages.length > 0;
  return (
    <div data-slot="preview-control" className="inline-flex items-center">
      <Button
        size="sm"
        data-slot="preview-enter"
        className={`${ENTER_CLASS}${split ? ` ${ENTER_ATTACHED_CLASS}` : ''}`}
        onClick={onPreview}
      >
        <Icon path={mdiPlay} size="14px" />
        Preview
      </Button>
      {/* Rule 20: only a multi-stage document has Forms to preview singly, so a Form document shows no menu. */}
      {!split ? null : (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="More preview options"
            data-slot="preview-more"
            className={TRIGGER_CLASS}
          >
            <Icon path={mdiDotsHorizontal} size="14px" />
          </DropdownMenuTrigger>
          {/* Rule 19b: compact items — small text, one line each, however long the Form's name is. */}
          <DropdownMenuContent align="end" data-slot="preview-menu" className="w-auto min-w-0">
            {/* Rule 20c: one section per STAGE, headed with the stage's name, so a Form is found where the author
                put it. Base UI requires a `Group` around a `GroupLabel`, which is also what ties a header to its
                items for a screen reader. */}
            {stages.map((stage) => (
              <DropdownMenuGroup key={stage.label}>
                <DropdownMenuLabel className="py-1 text-xs">{stage.label}</DropdownMenuLabel>
                {stage.forms.map((form) => (
                  <DropdownMenuItem
                    key={form.id}
                    className="py-1 text-xs whitespace-nowrap"
                    onClick={() => onPreviewForm(form.id)}
                  >
                    Preview {form.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
