import type { UISchemaElement } from '@jsonforms/core';
import { useCallback, useState } from 'react';
import { elementName } from '../../renderers/studio/element-actions';
import { DEFAULT_VARIANT, variantOf, withVariant, type DocumentContent } from '../document-types';
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
  variant = DEFAULT_VARIANT,
}: {
  content: DocumentContent | null;
  onContentChange: (content: DocumentContent) => void;
  /** The variant being edited (doc 262 rule 3). */
  variant?: string;
}) {
  const [elementId, setElementId] = useState<string | null>(null);
  const element =
    content === null || elementId === null
      ? undefined
      : findById(variantOf(content, variant), elementId);
  const target: RuleTarget | undefined =
    content === null || elementId === null || element === undefined
      ? undefined
      : {
          id: elementId,
          name: elementName(element as unknown as UISchemaElement, content.schema),
          rule: element['rule'],
          sources: ruleSources(content, elementId, variant),
        };
  const problems = useCallback(
    (id: string) => (content === null ? [] : ruleProblems(content, id, variant)),
    [content, variant],
  );
  // Doc 256 rule 9b: a rule needs a field to test, so with no source above an element there is nothing to add.
  const canAdd = useCallback(
    (id: string) => content !== null && ruleSources(content, id, variant).length > 0,
    [content, variant],
  );
  const dialog = (
    <RuleDialog
      target={target}
      onClose={() => setElementId(null)}
      onSave={(rule) => {
        if (content !== null && elementId !== null) {
          const root = variantOf(content, variant);
          const next = updateElement(root, elementId, {
            rule: rule as Record<string, unknown> | undefined,
          });
          if (next !== root) onContentChange(withVariant(content, next, variant));
        }
        setElementId(null);
      }}
    />
  );
  return { open: setElementId, dialog, problems, canAdd };
}
