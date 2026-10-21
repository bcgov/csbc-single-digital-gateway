import { rankWith, uiTypeIs, type OwnPropsOfRenderer, type RankedTester } from '@jsonforms/core';
import { useJsonForms } from '@jsonforms/react';
import { mdiShapeOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { PaletteItemElement } from '../../types/elements';
import { setupGridDragIn } from '../gridstack/grid-drag-in';
import { useStudioPalette } from './palette-actions';
import { matchesSearch, searchQuery } from './palette-search';

/** A `PaletteItem` — one draggable, activatable palette entry (doc 189 rule 8). */
export const paletteItemTester: RankedTester = rankWith(1, uiTypeIs('PaletteItem'));

/**
 * One matching item. A component of its own, so its drag-in registration (rule 10) mounts with it and is cleaned
 * up when the search hides it. It is a `div` with button semantics, never a `<button>`: gridstack's draggable
 * ignores a mousedown that starts on a button.
 */
function PaletteItemEntry({ item }: { readonly item: PaletteItemElement }) {
  const ref = useRef<HTMLDivElement>(null);
  const actions = useStudioPalette();
  const { template, label } = item;
  const authoredIcon = item.options?.icon;
  const icon =
    typeof authoredIcon === 'string' && authoredIcon.length > 0 ? authoredIcon : mdiShapeOutline;
  // Doc 196 rule 17: `options.dragIn: false` items (a Flow's Stage and Form) are activated only, never dragged in.
  const dragIn = item.options?.['dragIn'] !== false;

  useEffect(() => {
    const element = ref.current;
    return element && dragIn ? setupGridDragIn(element, template) : undefined;
  }, [template, dragIn]);

  // Rule 9: Enter and Space activate like a button; Space would otherwise scroll the panel.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    actions?.add(template);
  };

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={label}
      data-slot="palette-item"
      data-palette-template={template}
      className="flex h-7 cursor-grab items-center gap-2 rounded-md px-2 outline-none select-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 active:cursor-grabbing"
      // Doc 224: POINTERDOWN, not a drag event — gridstack's own drag has not started yet, and this is
      // the first moment the template is known. A press that turns out to be a click clears it the same
      // way an abandoned drag does, on the host's document-level pointerup.
      onPointerDown={dragIn ? () => actions?.beginDrag?.(template) : undefined}
      onClick={() => actions?.add(template)}
      onKeyDown={onKeyDown}
    >
      <Icon path={icon} size="16px" className="shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </div>
  );
}

/** Renders a `PaletteItem` when it matches the palette search, else nothing (rule 8). */
function PaletteItem({ uischema }: OwnPropsOfRenderer) {
  const item = uischema as PaletteItemElement;
  const query = searchQuery(useJsonForms().core?.data);
  return matchesSearch(item, query) ? <PaletteItemEntry item={item} /> : null;
}

export const PaletteItemRenderer = PaletteItem;
