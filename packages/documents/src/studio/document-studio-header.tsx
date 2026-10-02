import { mdiArrowLeft } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import { DOCUMENT_TYPE_INFO, type DocumentKind, type DocumentType } from './document-types';

/** What the content area shows (doc 247): the editable canvas, or the document filled in. */
export type StudioMode = 'edit' | 'preview';

export interface DocumentStudioHeaderProps {
  /** The open document; `null` until its type is known, which leaves the header bar empty. */
  document: { kind: DocumentKind; type: DocumentType } | null;
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  /** Given while a Form is focused (doc 233 rule 5): a Back button replaces the Type / Template badges. */
  onBack?: (() => void) | undefined;
}

/**
 * The studio's 36px header: the Edit | Preview toggle, then what the document is, Save at the far right. Every
 * control needs a document, so none render until one is open — the bar alone keeps the layout steady. Back and Save
 * belong to editing, so Preview draws neither (doc 247 rule 3).
 */
export function DocumentStudioHeader({
  document,
  mode,
  onModeChange,
  canSave,
  saving,
  onSave,
  onBack,
}: DocumentStudioHeaderProps) {
  const editing = mode === 'edit';
  return (
    <header
      data-slot="document-studio-header"
      className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-2"
    >
      {document !== null && (
        <>
          <ModeToggle mode={mode} onModeChange={onModeChange} />
          {editing && onBack !== undefined ? (
            <Button size="xs" variant="ghost" data-slot="document-studio-back" onClick={onBack}>
              <Icon path={mdiArrowLeft} size="14px" />
              Back
            </Button>
          ) : (
            <>
              <Badge color="green" data-slot="document-studio-type">
                Type: {DOCUMENT_TYPE_INFO[document.type].label}
              </Badge>
              {document.kind === 'template' && (
                <Badge color="grey" data-slot="document-studio-template">
                  Template
                </Badge>
              )}
            </>
          )}
          {editing && (
            <Button size="xs" className="ml-auto" disabled={!canSave || saving} onClick={onSave}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </>
      )}
    </header>
  );
}

/**
 * Edit | Preview (doc 247 rules 1-2). Exactly one item is pressed: pressing the pressed one makes Base UI report an
 * empty value, which is ignored, so the studio always has a mode.
 */
function ModeToggle({
  mode,
  onModeChange,
}: {
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
        if (next === 'edit' || next === 'preview') onModeChange(next);
      }}
    >
      <ToggleGroupItem value="edit">Edit</ToggleGroupItem>
      <ToggleGroupItem value="preview">Preview</ToggleGroupItem>
    </ToggleGroup>
  );
}
