import { mdiArrowLeft } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import { DOCUMENT_TYPE_INFO, type DocumentKind, type DocumentType } from './document-types';

/** What the content area shows (doc 247): the editable canvas, the document filled in, or (doc 282) read back. */
export type StudioMode = 'edit' | 'preview' | 'view';

const MODE_LABELS: Readonly<Record<StudioMode, string>> = Object.freeze({
  edit: 'Edit',
  preview: 'Preview',
  view: 'View',
});

/**
 * The modes a studio offers, in toggle order (doc 282 rules 14, 16): Edit unless read-only; View only when fillable —
 * a document without answers would read "Not answered" throughout. The LAST is where a read-only studio opens.
 */
export function studioModes(readOnly: boolean, fillable: boolean): readonly StudioMode[] {
  return [
    ...(readOnly ? [] : ['edit' as const]),
    'preview',
    ...(fillable ? ['view' as const] : []),
  ];
}

export interface DocumentStudioHeaderProps {
  /** The open document; `null` until its type is known, which leaves the header bar empty. */
  document: { kind: DocumentKind; type: DocumentType } | null;
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  /** The governing template's name (doc 259 rule 6): a "Based on" badge after the type. */
  basedOn?: string | undefined;
  /** Given while a Form is focused (doc 233 rule 5): a Back button replaces the Type / Template badges. */
  onBack?: (() => void) | undefined;
  /** False when the host saves (doc 276): no Save button. */
  hasSave?: boolean | undefined;
  /** The modes offered (`studioModes`); a single one draws no toggle (doc 276: read-only, not fillable). */
  modes: readonly StudioMode[];
}

/**
 * The studio's 36px header: Back when a Form is focused, the Edit | Preview toggle, then what the document is, Save
 * at the far right. Every control needs a document, so none render until one is open — the bar alone keeps the
 * layout steady. Back and Save belong to editing, so Preview draws neither; when Back shows it leads, left of the
 * toggle (doc 247 rules 1, 3).
 */
export function DocumentStudioHeader({
  document,
  mode,
  onModeChange,
  canSave,
  saving,
  onSave,
  basedOn,
  onBack,
  hasSave = true,
  modes,
}: DocumentStudioHeaderProps) {
  const editing = mode === 'edit';
  const showBack = editing && onBack !== undefined;
  return (
    <header
      data-slot="document-studio-header"
      className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-2"
    >
      {document !== null && (
        <>
          {showBack && (
            <Button size="xs" variant="ghost" data-slot="document-studio-back" onClick={onBack}>
              <Icon path={mdiArrowLeft} size="14px" />
              Back
            </Button>
          )}
          {/* One position in every state, so the toggle never remounts (and keeps focus) as Back comes and goes. */}
          {modes.length > 1 && <ModeToggle modes={modes} mode={mode} onModeChange={onModeChange} />}
          {!showBack && (
            <>
              <Badge color="green" data-slot="document-studio-type">
                Type: {DOCUMENT_TYPE_INFO[document.type].label}
              </Badge>
              {document.kind === 'template' && (
                <Badge color="grey" data-slot="document-studio-template">
                  Template
                </Badge>
              )}
              {basedOn !== undefined && (
                <Badge color="grey" data-slot="document-studio-based-on">
                  Based on {basedOn}
                </Badge>
              )}
            </>
          )}
          {editing && hasSave && (
            <Button size="xs" className="ml-auto" disabled={!canSave || saving} onClick={onSave}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </>
      )}
    </header>
  );
}

/** The pressed mode is BC Gov blue, on hover too (doc 247 rule 1c); `cn` merges it over the Toggle's muted fill. */
const PRESSED =
  'aria-pressed:border-bcgov-blue aria-pressed:bg-bcgov-blue aria-pressed:text-primary-foreground aria-pressed:hover:bg-bcgov-blue aria-pressed:hover:text-primary-foreground';

/**
 * Edit | Preview (doc 247 rules 1-2) | View (doc 282). Exactly one item is pressed: pressing the pressed one makes Base
 * UI report an empty value, which is ignored, so the studio always has a mode.
 */
function ModeToggle({
  modes,
  mode,
  onModeChange,
}: {
  modes: readonly StudioMode[];
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
}) {
  return (
    <ToggleGroup
      data-slot="document-studio-mode"
      aria-label="Mode"
      size="sm"
      variant="outline"
      spacing={0}
      value={[mode]}
      onValueChange={(value: unknown[]) => {
        const next = value[0];
        const offered = modes.find((candidate) => candidate === next);
        if (offered !== undefined) onModeChange(offered);
      }}
    >
      {modes.map((value) => (
        <ToggleGroupItem key={value} value={value} className={PRESSED}>
          {MODE_LABELS[value]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
