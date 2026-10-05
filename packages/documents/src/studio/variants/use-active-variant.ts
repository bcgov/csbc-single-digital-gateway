import { useMemo, useState } from 'react';
import { DEFAULT_VARIANT, type DocumentContent } from '../document-types';
import { createVariant, deleteVariant, renameVariant, variantNames } from './variant-edits';
import { variantProblems, type MissingField } from './variant-problems';
import type { VariantTabsProps } from './variant-tabs';

/**
 * The variant the studio edits (doc 262 rules 2-4, 6-12): studio state, never content, so switching never dirties the
 * document. `documentKey` is the open document — another one resets to default, a first save (`isNew` → saved) does
 * not. A variant that disappears falls back to default. `onSwitch` runs on every change of variant, so the studio can
 * reset focus and selection (rule 3).
 */
export function useActiveVariant({
  content,
  documentKey,
  isNew,
  manage,
  setContent,
  onSwitch,
}: {
  content: DocumentContent | null;
  documentKey: string | null;
  /** Whether `documentKey` names a document not yet saved. */
  isNew: (key: string | null) => boolean;
  /** Whether the variant set may change (rule 11). */
  manage: boolean;
  setContent: (content: DocumentContent) => void;
  onSwitch: () => void;
}) {
  const [chosen, setChosen] = useState(DEFAULT_VARIANT);
  const [openFor, setOpenFor] = useState(documentKey);
  if (openFor !== documentKey) {
    setOpenFor(documentKey);
    if (!isNew(openFor)) setChosen(DEFAULT_VARIANT);
  }
  const active =
    content !== null && Object.hasOwn(content.variants, chosen) ? chosen : DEFAULT_VARIANT;
  const missing = useMemo(
    () =>
      new Map<string, readonly MissingField[]>(
        content === null ? [] : variantProblems(content).map((p) => [p.variant, p.missing]),
      ),
    [content],
  );
  const select = (name: string) => {
    if (name === active) return;
    setChosen(name);
    onSwitch();
  };
  const tabs: VariantTabsProps | null =
    content === null
      ? null
      : {
          names: variantNames(content),
          active,
          onSelect: select,
          missing,
          manage,
          onCreate: (name) => {
            const next = createVariant(content, name);
            if (next === content) return;
            setContent(next);
            select(name.trim());
          },
          onRename: (from, to) => {
            const next = renameVariant(content, from, to);
            if (next === content) return;
            setContent(next);
            // The same variant under its new name: no switch, so focus and selection stay.
            if (active === from) setChosen(to.trim());
          },
          onDelete: (name) => {
            const next = deleteVariant(content, name);
            if (next === content) return;
            setContent(next);
            if (active === name) select(DEFAULT_VARIANT);
          },
        };
  return { active, tabs };
}
