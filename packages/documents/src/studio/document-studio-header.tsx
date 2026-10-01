import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { DOCUMENT_TYPE_INFO, type DocumentKind, type DocumentType } from './document-types';

export interface DocumentStudioHeaderProps {
  /** The open document; `null` until its type is known, which leaves the header bar empty. */
  document: { kind: DocumentKind; type: DocumentType } | null;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
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
}: DocumentStudioHeaderProps) {
  return (
    <header
      data-slot="document-studio-header"
      className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-2"
    >
      {document !== null && (
        <>
          <Badge color="green" data-slot="document-studio-type">
            Type: {DOCUMENT_TYPE_INFO[document.type].label}
          </Badge>
          {document.kind === 'template' && (
            <Badge color="grey" data-slot="document-studio-template">
              Template
            </Badge>
          )}
          <Button size="xs" className="ml-auto" disabled={!canSave || saving} onClick={onSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      )}
    </header>
  );
}
