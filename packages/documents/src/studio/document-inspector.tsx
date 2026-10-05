import { mdiCodeJson, mdiCog } from '@mdi/js';
import { Icon } from '@mdi/react';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import { useState } from 'react';
import type { DocumentContent } from './document-types';
import { FoldsProvider } from './foldable-section';
import { InspectorSettings } from './inspector/inspector-settings';
import type { TargetInputs } from './inspector/inspector-target';
import { StudioPanel } from './studio-panel';

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

export interface DocumentInspectorProps extends TargetInputs {
  content: DocumentContent;
  /** Applies a Settings edit (doc 249). */
  onContentChange: (content: DocumentContent) => void;
  /** Opens the options editor for a choice field (doc 255 rule 2). */
  onEditOptions?: ((elementId: string) => void) | undefined;
  /** Opens the rule dialog for a page element (doc 256 rule 13). */
  onEditRule?: ((elementId: string) => void) | undefined;
  /** The document is a template: show its Implementation Rules (doc 258 rule 1). */
  templateRules?: boolean;
  /** Whether the collapsed inspector is open, expanded (doc 233 rule 14). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bumped to reveal the inspector (doc 234 rule 7) — see `StudioPanel`'s `revealKey`. */
  revealKey?: number | undefined;
}

/**
 * The floating inspector over the canvas (doc 232 rules 9-12): always shown with a document, selection or not, with
 * Settings ("Inspector", the inspected element's properties — doc 249) and JSON ("Schema") views; the header is titled by the view. It collapses to a cog below the
 * canvas breakpoint (doc 233 rule 14); the view is held here, so the docked and expanded forms share it.
 */
export function DocumentInspector({
  content,
  onContentChange,
  onEditOptions,
  onEditRule,
  templateRules = false,
  pageSelectedId,
  focusedId,
  formId,
  open,
  onOpenChange,
  revealKey,
}: DocumentInspectorProps) {
  const [view, setView] = useState<InspectorView>('settings');
  return (
    <StudioPanel
      label="Inspector"
      title={VIEW_INFO[view].title}
      icon={mdiCog}
      side="right"
      width="w-80"
      open={open}
      onOpenChange={onOpenChange}
      revealKey={revealKey}
      slot="document-studio-inspector"
      actions={
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
      }
    >
      {view === 'json' ? (
        <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs">
          {JSON.stringify(content, null, 2)}
        </pre>
      ) : (
        <div
          data-slot="document-studio-inspector-settings"
          className="min-h-0 flex-1 overflow-auto p-2"
        >
          <FoldsProvider>
            <InspectorSettings
              content={content}
              pageSelectedId={pageSelectedId}
              focusedId={focusedId}
              formId={formId}
              onContentChange={onContentChange}
              onEditOptions={onEditOptions}
              onEditRule={onEditRule}
              templateRules={templateRules}
            />
          </FoldsProvider>
        </div>
      )}
    </StudioPanel>
  );
}
