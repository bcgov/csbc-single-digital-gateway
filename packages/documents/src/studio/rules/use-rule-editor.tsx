import type { UISchemaElement } from '@jsonforms/core';
import { useCallback, useState } from 'react';
import { elementName } from '../../renderers/studio/element-actions';
import { withVariant, type DocumentContent } from '../document-types';
import { updateElement } from '../element-edits';
import { findById } from '../element-ids';
import { ruleProblems } from './rule-problems';
import { RuleDialog, type RuleTarget } from './rule-dialog';
import { ruleSources } from './rule-sources';

/**
 * The studio's rule editor (doc 256): which element's rule dialog is open, the dialog, and the problem check the canvas
 * draws its error state from. An element that disappears simply closes the dialog.
 */
export function useRuleEditor({
  content,
  onContentChange,
}: {
  content: DocumentContent | null;
  onContentChange: (content: DocumentContent) => void;
}) {
  const [elementId, setElementId] = useState<string | null>(null);
  const element =
    content === null || elementId === null
      ? undefined
      : findById(content.variants.default, elementId);
  const target: RuleTarget | undefined =
    content === null || elementId === null || element === undefined
      ? undefined
      : {
          id: elementId,
          name: elementName(element as unknown as UISchemaElement, content.schema),
          rule: element['rule'],
          sources: ruleSources(content, elementId),
        };
  const problems = useCallback(
    (id: string) => (content === null ? [] : ruleProblems(content, id)),
    [content],
  );
  const dialog = (
    <RuleDialog
      target={target}
      onClose={() => setElementId(null)}
      onSave={(rule) => {
        if (content !== null && elementId !== null) {
          const root = content.variants.default;
          const next = updateElement(root, elementId, {
            rule: rule as Record<string, unknown> | undefined,
          });
          if (next !== root) onContentChange(withVariant(content, next));
        }
        setElementId(null);
      }}
    />
  );
  return { open: setElementId, dialog, problems };
}
