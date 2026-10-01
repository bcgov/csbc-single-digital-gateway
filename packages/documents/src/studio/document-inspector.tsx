import { mdiCodeJson, mdiCog } from '@mdi/js';
import { Icon } from '@mdi/react';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import { useState } from 'react';
import type { DocumentContent } from './document-types';

const VIEWS = ['settings', 'json'] as const;
type InspectorView = (typeof VIEWS)[number];

/** `title` heads the panel while the view is shown; `label` names its toggle. */
const VIEW_INFO: Readonly<Record<InspectorView, { title: string; label: string; icon: string }>> =
  Object.freeze({
    settings: { title: 'Inspector', label: 'Settings', icon: mdiCog },
    json: { title: 'Schema', label: 'JSON', icon: mdiCodeJson },
  });

/** `@repo/forms`' studio header toggles' 24px square. */
const TOGGLE_CLASSES =
  'size-6 min-w-6 px-0 group-data-[spacing=0]/toggle-group:px-0 text-gray-70 aria-pressed:text-foreground';

export interface DocumentInspectorProps {
  content: DocumentContent;
}

/**
 * The floating inspector over the canvas (doc 232 rules 9-12): always shown with a document, selection or not, with
 * Settings ("Inspector") and JSON ("Schema") views; the header is titled by the view.
 */
export function DocumentInspector({ content }: DocumentInspectorProps) {
  const [view, setView] = useState<InspectorView>('settings');
  return (
    <section
      aria-label="Inspector"
      data-slot="document-studio-inspector"
      className="absolute top-3 right-3 z-10 flex max-h-[calc(100%-1.5rem)] w-80 flex-col overflow-hidden rounded-md border border-border bg-background shadow-md"
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border pr-1.5 pl-3">
        <h2 className="min-w-0 flex-1 truncate text-xs font-medium">{VIEW_INFO[view].title}</h2>
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={0}
          aria-label="Inspector view"
          value={[view]}
          // Pressing the pressed item reports an empty set; a view is always shown, so that report is ignored.
          onValueChange={(next: string[]) => {
            const picked = VIEWS.find((id) => next.includes(id) && id !== view);
            if (picked !== undefined) setView(picked);
          }}
        >
          {VIEWS.map((id) => (
            <ToggleGroupItem
              key={id}
              value={id}
              className={TOGGLE_CLASSES}
              aria-label={VIEW_INFO[id].label}
            >
              <Icon path={VIEW_INFO[id].icon} size="16px" />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </header>
      {view === 'json' ? (
        <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs">
          {JSON.stringify(content, null, 2)}
        </pre>
      ) : (
        <div
          data-slot="document-studio-inspector-settings"
          className="min-h-0 flex-1 overflow-auto p-3"
        />
      )}
    </section>
  );
}
