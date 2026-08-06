import { useDraggable } from '@dnd-kit/react';
import { useMemo, useState } from 'react';
import { ClearableInput } from './clearable-input';
import { FIELD_TYPES, type FieldGroup, type FieldTypeDef, type FieldTypeId } from './field-types';

const GROUP_ORDER: FieldGroup[] = [
  'Core',
  'Choice',
  'Date & time',
  'Advanced',
  'Display',
  'Layout',
  'Other',
];

function matches(def: FieldTypeDef, query: string): boolean {
  if (query === '') {
    return true;
  }
  const haystack = [def.label, def.id, ...(def.keywords ?? [])].join(' ').toLowerCase();
  return haystack.includes(query.toLowerCase());
}

/**
 * A palette entry is a plain **draggable** (NOT a sortable) — it must stay put in the palette while
 * dragging (a sortable would get relocated into the canvas by the optimistic plugin). The canvas shows
 * a drop placeholder for palette drags itself (see field-rows). Also supports click-to-add.
 */
function PaletteItem({ def, onAdd }: { def: FieldTypeDef; onAdd: (id: FieldTypeId) => void }) {
  const { ref, isDragging } = useDraggable({
    id: `palette:${def.id}`,
    type: 'palette-item',
    data: { fieldType: def.id },
  });
  const Icon = def.icon;
  return (
    <button
      ref={ref}
      type="button"
      aria-label={def.label}
      onClick={() => onAdd(def.id)}
      data-dragging={isDragging || undefined}
      className="flex w-full items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:border-primary data-[dragging]:opacity-50"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium">{def.label}</span>
        <span className="text-xs text-muted-foreground">{def.description}</span>
      </span>
    </button>
  );
}

/** Left column: searchable, grouped, draggable (and click-to-add) component catalogue. */
export function Palette({ onAdd }: { onAdd: (id: FieldTypeId) => void }) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const visible = FIELD_TYPES.filter((def) => matches(def, query));
    return GROUP_ORDER.map((group) => ({
      group,
      items: visible.filter((def) => def.group === group),
    })).filter((section) => section.items.length > 0);
  }, [query]);

  return (
    <section
      aria-label="Palette"
      className="flex h-full flex-col gap-3 overflow-y-auto border-r border-border bg-card p-3"
    >
      <ClearableInput
        type="text"
        aria-label="Search components"
        placeholder="Search components"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onClear={() => setQuery('')}
      />
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No components match.</p>
      ) : (
        groups.map((section) => (
          <div key={section.group} className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {section.group}
            </span>
            {section.items.map((def) => (
              <PaletteItem key={def.id} def={def} onAdd={onAdd} />
            ))}
          </div>
        ))
      )}
    </section>
  );
}
