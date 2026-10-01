import { Icon } from '@mdi/react';
import { Input } from '@repo/ui/input';
import { GridStack } from 'gridstack';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { PaletteItem } from './palette-items';

/** The drop preview a dragged item shows: 10 rows (40px) — a one-row preview draws nothing (doc 238 rule 10). */
const dragInWidget = () => ({ w: 1, h: 10 });

/**
 * The Palette's body (doc 238 rules 5-10): a search box over the items, grouped under headings in order of first
 * appearance. An item is a gridstack drag-in source, and a click, Enter or Space appends it to the focused Form. The
 * search text is the caller's, because the docked and the expanded panel both render this body.
 */
export function PaletteList({
  items,
  query,
  onQueryChange,
  onAppend,
}: {
  items: readonly PaletteItem[];
  query: string;
  onQueryChange: (query: string) => void;
  onAppend: (itemId: string) => void;
}) {
  const shown = matching(items, query);
  const groups = grouped(shown);
  const list = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const itemEls = () => [
    ...(list.current?.querySelectorAll<HTMLElement>('[data-palette-item]') ?? []),
  ];
  // Arrow keys move through the shown items in list order; ↑ from the first returns to the search (doc 238 rule 8b).
  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const rows = itemEls();
    const at = rows.findIndex((el) => el === event.target);
    if (at === -1) return;
    event.preventDefault();
    const next = event.key === 'ArrowDown' ? rows[at + 1] : rows[at - 1];
    if (next !== undefined) next.focus();
    else if (event.key === 'ArrowUp') search.current?.focus();
  };
  const shownIds = shown.map((item) => item.id).join('\u0000');

  useEffect(() => {
    const sources = [...(list.current?.querySelectorAll<HTMLElement>('[data-palette-item]') ?? [])];
    // gridstack skips an element it has already made draggable, so re-running for new items is safe.
    // One widget PER element: gridstack pairs `widgets[i]` with `sources[i]`, so a single widget sized only the first.
    if (sources.length > 0) {
      GridStack.setupDragIn(
        sources,
        { appendTo: 'body', helper: 'clone' },
        sources.map(dragInWidget),
      );
    }
  }, [shownIds]);

  return (
    <div data-slot="document-studio-palette-list" className="flex flex-col gap-3">
      <Input
        ref={search}
        type="search"
        aria-label="Search the palette"
        placeholder="Search"
        // Compact: the panel's own scale, not a form field's.
        className="h-7 px-2 py-1 text-xs"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown') return;
          event.preventDefault();
          itemEls()[0]?.focus();
        }}
      />
      <div ref={list} className="flex flex-col gap-3" onKeyDown={onListKeyDown}>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matches</p>
        ) : (
          groups.map(([group, members]) => (
            <section key={group} aria-label={group} className="flex flex-col gap-1">
              <h3 className="text-xs font-semibold text-muted-foreground">{group}</h3>
              {members.map((item) => (
                <PaletteItemRow key={item.id} item={item} onAppend={onAppend} />
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * One item: an icon and a label. A `div` with the button role, not a `<button>`, because gridstack's draggable ignores
 * presses on buttons (forms trap 189-4).
 */
function PaletteItemRow({
  item,
  onAppend,
}: {
  item: PaletteItem;
  onAppend: (itemId: string) => void;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onAppend(item.id);
  };
  return (
    <div
      role="button"
      tabIndex={0}
      data-palette-item={item.id}
      onClick={() => onAppend(item.id)}
      onKeyDown={onKeyDown}
      className="flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
    >
      <Icon path={item.icon} size="18px" className="shrink-0 text-muted-foreground" />
      <span>{item.label}</span>
    </div>
  );
}

/** Items whose label or a keyword contains the trimmed query, case-insensitively; all of them for an empty query. */
function matching(items: readonly PaletteItem[], query: string): PaletteItem[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [...items];
  return items.filter((item) =>
    [item.label, ...(item.keywords ?? [])].some((term) => term.toLowerCase().includes(needle)),
  );
}

/** Items by group, groups in order of first appearance (rule 6). */
function grouped(items: readonly PaletteItem[]): [string, PaletteItem[]][] {
  const groups = new Map<string, PaletteItem[]>();
  for (const item of items) groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  return [...groups];
}
