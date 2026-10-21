import { isStringControl, rankWith, type ControlProps, type RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { mdiMagnify } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Input } from '@repo/ui/input';

/** The palette's search — its only Control (doc 189 rule 4). */
export const searchTester: RankedTester = rankWith(1, isStringControl);

/**
 * Renders a string Control as a search input with a leading magnifier, named by the control label with no visible
 * label; the placeholder is `options.placeholder` when a non-empty string, else the label. Clearing writes
 * `undefined`. A plain positioned wrapper, not an `InputGroup`: its `role="group"` would read as a palette group.
 */
function SearchControl({
  data,
  path,
  label,
  uischema,
  enabled,
  visible,
  handleChange,
}: ControlProps) {
  if (!visible) return null;
  const authored = uischema.options?.['placeholder'];
  const placeholder = typeof authored === 'string' && authored.length > 0 ? authored : label;

  return (
    <div data-slot="palette-search" className="relative">
      <Icon
        path={mdiMagnify}
        size="16px"
        className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        disabled={!enabled}
        className="h-8 pl-7 text-xs"
        value={typeof data === 'string' ? data : ''}
        onChange={(event) => handleChange(path, event.target.value || undefined)}
      />
    </div>
  );
}

export const SearchControlRenderer = withJsonFormsControlProps(SearchControl);
