import { useCallback, useState } from 'react';
import type { Uischema } from './document-types';
import { selectionPath, withPagePath, type PathSegment, type SegmentKind } from './selection-path';

/**
 * The studio's two selections: the flow's (a Form or Condition node, doc 232) and the focused page's element (doc 238
 * rule 16b, stale ids tolerated). `selectCrumb` is the footer's: an element crumb selects on the page, a Form crumb or
 * the root selects on the flow and leaves the page.
 */
export function useStudioSelection() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageSelectedId, setPageSelectedId] = useState<string | null>(null);
  const selectCrumb = useCallback((id: string | null, kind?: SegmentKind) => {
    if (kind !== 'element') setSelectedId(id);
    setPageSelectedId(kind === 'element' ? id : null);
  }, []);
  return { selectedId, setSelectedId, pageSelectedId, setPageSelectedId, selectCrumb };
}

/**
 * Derived, so a deleted Form or another document simply stops being selected (doc 232 rule 5). With nothing selected,
 * a focused Form is selected by default (doc 233 rule 6). `shownSelection` is the FLOW selection the canvas and
 * inspector use; `footerPath` continues into the focused page down to its selected element.
 */
export function selectionPaths(
  variant: Uischema | null,
  schema: Record<string, unknown>,
  focusedId: string | null,
  selectedId: string | null,
  pageSelectedId: string | null,
): { path: PathSegment[] | null; shownSelection: string | null; footerPath: PathSegment[] | null } {
  const path =
    variant === null
      ? null
      : (selectionPath(variant, selectedId) ?? selectionPath(variant, focusedId));
  return {
    path,
    shownSelection: path?.at(-1)?.id ?? null,
    footerPath: withPagePath(path, variant, schema, focusedId, pageSelectedId),
  };
}
