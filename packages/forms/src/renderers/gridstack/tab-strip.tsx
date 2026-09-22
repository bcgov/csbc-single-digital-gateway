import { mdiClose, mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { TabsList, TabsTrigger } from '@repo/ui/tabs';
import { useState, type DragEvent } from 'react';
import type { TabsEditor } from './tabs-editor';

// The row of tabs, and the `+` at its end (doc 216 rules 15, 19-20).

/** One tab: the value the `Tabs` root keys panels by, and the trigger's text. */
export interface TabDescriptor {
  readonly value: string;
  readonly label: string;
}

/**
 * Rule 19: a private drag type, so a drag from anywhere else in the app is never mistaken for a tab reorder.
 * The same guard `option-row.tsx` takes (doc 208 rule 14).
 */
const DRAG_TYPE = 'application/x-sdg-tab-index';

/**
 * Rule 15: the tabs scroll and the `+` stays at the end.
 *
 * `TabsList` is `inline-flex w-fit`, so it takes the horizontal overflow itself (`min-w-0 overflow-x-auto`)
 * while the `+` sits OUTSIDE it as a sibling in this flex row. Putting the `+` inside the list would scroll it
 * away with the tabs — and would also make it a child of the `tablist`, where a button that is not a tab does
 * not belong.
 */
const STRIP_CLASS = 'flex items-center gap-1';
/** Rule 15b: the tabs start at the left edge — `TabsList` centres its children by default. */
const LIST_CLASS = 'min-w-0 flex-1 justify-start overflow-x-auto';
/**
 * Rule 15b: a tab is exactly as wide as its name, aligned left.
 *
 * `flex-none`, NOT `shrink-0` alone: `TabsTrigger` is `flex-1`, and `flex-1`/`shrink-0` are DIFFERENT CSS
 * properties (`flex` and `flex-shrink`), so tailwind-merge keeps both and `flex-grow: 1` survives — the tabs
 * still stretched to fill the row. `flex-none` is in the same group as `flex-1`, so it replaces it outright.
 * `justify-start` because `TabsTrigger` centres its own content.
 *
 * Rule 20: `nodrag` because a Tabs may sit inside a gridstack item, whose draggable would otherwise
 * claim the press; `pointer-events-auto` follows the row-control convention (doc 198).
 */
const TRIGGER_CLASS = 'flex-none shrink-0 justify-start nodrag pointer-events-auto';

/**
 * Rule 19b: the tab being dragged is dimmed while its neighbours move out of its way, so the strip shows the
 * order it will land in rather than only where the pointer is.
 *
 * `data-[dragging]`, the ARBITRARY form — `data-dragging:` is one of shadcn's custom variants and matches
 * `[data-dragging="true"]`, so a bare presence attribute would silently style nothing (CLAUDE.md, doc 186).
 */
const DRAGGING_CLASS = 'data-[dragging]:opacity-40';

/** Rule 19b: `order` moved so `from` sits at `to`, leaving every other tab's relative order alone. */
function movedOrder(count: number, from: number, to: number): number[] {
  const order = Array.from({ length: count }, (_unused, index) => index);
  const [moved] = order.splice(from, 1);
  if (moved !== undefined) order.splice(to, 0, moved);
  return order;
}
/**
 * Rule 18: the Delete a Tab gets INSTEAD of the actions popover, which only grid items have. Shown on EVERY tab
 * under an editor (user, 2026-09-22), not just the open one: a control that appears only on hover or only on
 * the current tab is a control an author has to go looking for, and deleting a tab you are not standing on is
 * the ordinary case.
 *
 * It is a `span`, not a nested `<button>`, because `TabsTrigger` IS a button and nesting one is invalid HTML
 * that React will not render.
 */
const REMOVE_CLASS =
  'ml-1 inline-flex size-4 items-center justify-center rounded-sm text-foreground/50 hover:bg-muted hover:text-foreground';

const ADD_CLASS =
  'shrink-0 nodrag nopan pointer-events-auto inline-flex size-6 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring';

interface TabStripProps {
  readonly tabs: readonly TabDescriptor[];
  /** The editable strip's port, or `null` for a static one (rule 14). */
  readonly editor: TabsEditor | null;
  /** The Tabs's studio id; only ever read under an editor. */
  readonly tabsId: string;
}

/** Rule 19: the index this drag started from, or `undefined` when the drag is not one of ours. */
function draggedIndex(event: DragEvent<HTMLElement>): number | undefined {
  if (!event.dataTransfer.types.includes(DRAG_TYPE)) return undefined;
  const from = Number(event.dataTransfer.getData(DRAG_TYPE));
  return Number.isInteger(from) ? from : undefined;
}

export function TabStrip({ tabs, editor, tabsId }: TabStripProps) {
  /**
   * Rule 19b: the drag in progress — where it started, and where it would land. Held here rather than derived,
   * because a native HTML drag reports only the element under the pointer and the document does not change
   * until the drop: the preview IS local state, and clearing it on `dragend` is what guarantees it never
   * outlives the drag.
   */
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const order = drag ? movedOrder(tabs.length, drag.from, drag.to) : null;
  const shown = order ? order.map((index) => ({ tab: tabs[index], index })) : null;
  const previewed = shown?.every(
    (entry): entry is { tab: TabDescriptor; index: number } => entry.tab !== undefined,
  )
    ? shown
    : tabs.map((tab, index) => ({ tab, index }));

  return (
    <div data-slot="tab-strip" className={STRIP_CLASS}>
      <TabsList className={LIST_CLASS}>
        {previewed.map(({ tab, index }, position) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={`${TRIGGER_CLASS} ${DRAGGING_CLASS}`}
            {...(drag?.from === index ? { 'data-dragging': '' } : {})}
            // Rules 19-20: native HTML drag, like the options editor's rows. jsdom cannot perform a real drag,
            // so the gesture is tested through these handlers and the pure edit, never through a scripted drag.
            draggable={editor !== null}
            /**
             * Rule 40: the trigger selects its Tab on EVERY click, not through the `Tabs` root's
             * `onValueChange` — Base UI fires that only when the value CHANGES, so clicking the tab that is
             * already open emitted nothing, the Tab was never selected, and the first tab's label and
             * description could not be edited at all.
             */
            /**
             * Rule 40b: on POINTERDOWN, and the press stops here.
             *
             * The studio selects on pointerdown too, and a press on the strip resolves to the Tabs element —
             * so the selection went to the Tabs first (and rule 17's derivation fell back to the FIRST tab),
             * and only on mouseup did the click handler select the tab actually under the cursor. The tab bar
             * visibly selected the wrong tab and then corrected itself.
             */
            onPointerDown={(event) => {
              event.stopPropagation();
              editor?.onGesture({ type: 'open-tab', tabId: tab.value });
            }}
            // Rule 40: also on click, for the keyboard — Base UI's `onValueChange` stays silent when the
            // already-open tab is activated. Selecting the same Tab twice is a no-op.
            onClick={() => editor?.onGesture({ type: 'open-tab', tabId: tab.value })}
            onDragStart={(event) => {
              event.dataTransfer.setData(DRAG_TYPE, String(index));
              event.dataTransfer.effectAllowed = 'move';
              setDrag({ from: index, to: index });
            }}
            onDragOver={(event) => {
              if (editor === null || draggedIndex(event) === undefined) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              // Rule 19b: `position` is where the pointer is in the PREVIEWED strip, which is exactly the
              // index the dragged tab would occupy — so the preview converges instead of oscillating.
              setDrag((current) =>
                current === null || current.to === position
                  ? current
                  : { ...current, to: position },
              );
            }}
            onDragEnd={() => setDrag(null)}
            onDrop={(event) => {
              const from = draggedIndex(event);
              setDrag(null);
              if (editor === null || from === undefined || from === position) return;
              event.preventDefault();
              // `position`, not `index`: the drop lands where the preview showed it, and `reorderTabs`
              // re-inserts AFTER removing, which is the same indexing the preview used.
              editor.onGesture({ type: 'reorder-tabs', tabsId, from, to: position });
            }}
          >
            {tab.label}
            {editor === null ? null : (
              <span
                role="button"
                tabIndex={-1}
                data-slot="tab-strip-remove"
                aria-label={`Delete ${tab.label === '' ? 'tab' : tab.label}`}
                className={REMOVE_CLASS}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  // The trigger would otherwise also open the tab; the confirmation is the only outcome wanted.
                  event.stopPropagation();
                  editor.onGesture({ type: 'remove-tab', tabId: tab.value });
                }}
              >
                <Icon path={mdiClose} size="12px" />
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {editor === null ? null : (
        <button
          type="button"
          data-slot="tab-strip-add"
          aria-label="Add tab"
          className={ADD_CLASS}
          onClick={() => editor.onGesture({ type: 'add-tab', tabsId })}
        >
          <Icon path={mdiPlus} size="16px" />
        </button>
      )}
    </div>
  );
}
