import { mdiArrowLeft } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { DOCUMENT_TYPE_INFO, type DocumentKind, type DocumentType } from './document-types';

export interface DocumentStudioHeaderProps {
  /** The open document; `null` until its type is known, which leaves the header bar empty. */
  document: { kind: DocumentKind; type: DocumentType } | null;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  /** Given while a Form is focused (doc 233 rule 5): a Back button replaces the Type / Template badges. */
  onBack?: (() => void) | undefined;
}

/**
 * The studio's 36px header: what the document is on the left, Save at the far right. Every control needs a
 * document, so none render until one is open — the bar alone keeps the layout steady.
 */
export function DocumentStudioHeader({
  document,
  canSave,
  saving,
  onSave,
  onBack,
}: DocumentStudioHeaderProps) {
  return (
    <header
      data-slot="document-studio-header"
      className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-2"
    >
      {document !== null && (
        <>
          {onBack !== undefined ? (
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
          <Button size="xs" className="ml-auto" disabled={!canSave || saving} onClick={onSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      )}
    </header>
  );
}
