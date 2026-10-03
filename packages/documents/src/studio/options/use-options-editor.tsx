import { useState } from 'react';
import type { DocumentContent } from '../document-types';
import { inspectorTarget } from '../inspector/inspector-target';
import { OptionsDialog } from './options-dialog';
import { optionsTargetOf } from './options-target';
import { saveOptions } from './save-options';

/**
 * The studio's options editor (doc 255): which choice field is open, and the dialog for it. The field is resolved like
 * the inspector's target, so one deleted or no longer on the focused page simply closes the dialog; a save writes the
 * options and any Condition renames in ONE content change.
 */
export function useOptionsEditor({
  content,
  focusedId,
  formId,
  onContentChange,
}: {
  content: DocumentContent | null;
  focusedId: string | null;
  formId: string | null;
  onContentChange: (content: DocumentContent) => void;
}) {
  const [elementId, setElementId] = useState<string | null>(null);
  const target =
    content === null || elementId === null
      ? undefined
      : optionsTargetOf(inspectorTarget(content, { pageSelectedId: elementId, focusedId, formId }));
  const dialog =
    content === null ? null : (
      <OptionsDialog
        target={target}
        uischema={content.variants.default}
        onCancel={() => setElementId(null)}
        onSave={(entries, renames) => {
          if (target !== undefined) onContentChange(saveOptions(content, target, entries, renames));
          setElementId(null);
        }}
      />
    );
  return { open: setElementId, dialog };
}
