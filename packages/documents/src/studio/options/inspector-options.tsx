import { LOCKED } from '../capabilities/governance';
import { Button } from '@repo/ui/button';
import { FoldableSection } from '../foldable-section';
import { SECTION_CLASSES } from '../inspector/inspector-renderers';
import type { OptionsTarget } from './options-target';

// Doc 255 rule 2 — the inspector's read-only Options section, drawn OUTSIDE its JSONForms form: an option list never
// rides the form's data channel, and the dialog does not use it at all.

/** How many options are listed before `+N more`. */
const PREVIEW = 4;

const countLabel = (count: number) => `${count} ${count === 1 ? 'option' : 'options'}`;

export function InspectorOptions({
  target,
  locked = false,
  onEdit,
}: {
  target: OptionsTarget;
  /** The pinned template locks the Options (doc 259 rule 18): Edit options disabled. */
  locked?: boolean;
  onEdit: () => void;
}) {
  const { options } = target;
  const shown = options.slice(0, PREVIEW);
  const overflow = options.length - shown.length;
  return (
    // A fourth foldable section, after the form's, ruled off like them (doc 252).
    <FoldableSection
      name="Options"
      {...SECTION_CLASSES}
      className={`${SECTION_CLASSES.className} mt-2`}
    >
      <p className="text-xs text-muted-foreground">{countLabel(options.length)}</p>
      <ul data-slot="inspector-options" className="overflow-hidden rounded-md border border-border">
        {shown.map((option) => (
          <li
            key={String(option.value)}
            className="flex items-center justify-between gap-2 border-b border-border px-2 py-1 last:border-b-0"
          >
            {/* Both sides shrink, and the value is capped at 45%, so the LABEL — what an author recognises an option
                by — keeps the larger share. */}
            <span className="min-w-0 flex-1 truncate text-xs">{option.label}</span>
            <span className="max-w-[45%] min-w-0 truncate font-mono text-[11px] text-muted-foreground">
              {String(option.value)}
            </span>
          </li>
        ))}
        {overflow > 0 && (
          <li className="bg-gray-10 px-2 py-1 text-xs text-muted-foreground">+{overflow} more</li>
        )}
      </ul>
      <Button
        size="sm"
        className="mt-1 h-7 w-full text-xs"
        disabled={locked}
        {...(locked && { title: LOCKED })}
        onClick={onEdit}
      >
        Edit options
      </Button>
    </FoldableSection>
  );
}
