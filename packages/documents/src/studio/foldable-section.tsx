import { mdiChevronDown } from '@mdi/js';
import { Icon } from '@mdi/react';
import { createContext, useContext, useId, useMemo, useState, type ReactNode } from 'react';

/** Which sections are folded, by NAME (doc 252 rule 8). */
export interface Folds {
  folded: (name: string) => boolean;
  toggle: (name: string) => void;
}

const ALL_OPEN: Folds = { folded: () => false, toggle: () => {} };

const FoldsContext = createContext<Folds>(ALL_OPEN);

/**
 * Holds fold state for the panel body below it — the inspector (above its per-element form, which remounts on every
 * selection) or the palette — so a folded section stays folded until the panel goes away. Nothing is persisted.
 */
export function FoldsProvider({ children }: { children: ReactNode }) {
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set());
  const value = useMemo<Folds>(
    () => ({
      folded: (name) => folded.has(name),
      toggle: (name) =>
        setFolded((current) => {
          const next = new Set(current);
          if (!next.delete(name)) next.add(name);
          return next;
        }),
    }),
    [folded],
  );
  return <FoldsContext.Provider value={value}>{children}</FoldsContext.Provider>;
}

/** The fold state; outside a provider every section is open and its heading does nothing. */
export function useFolds(): Folds {
  return useContext(FoldsContext);
}

export interface FoldableSectionProps {
  name: string;
  /** Shown open whatever the fold state, e.g. while the palette is searched. */
  forceOpen?: boolean;
  className?: string;
  headingClassName?: string;
  rowsClassName?: string;
  children: ReactNode;
}

/**
 * A headed section that folds (doc 252 rules 7-8): the heading is a full-width button — the name left, a chevron RIGHT,
 * rotated when folded — with `aria-expanded` / `aria-controls`. Folded rows stay MOUNTED but `hidden`: palette items are
 * made draggable once by gridstack, so an item first mounted on unfold would never drag.
 */
export function FoldableSection({
  name,
  forceOpen = false,
  className = '',
  headingClassName = '',
  rowsClassName = '',
  children,
}: FoldableSectionProps) {
  const folds = useFolds();
  const id = useId();
  const folded = !forceOpen && folds.folded(name);
  return (
    <section data-slot="foldable-section" aria-label={name} className={className}>
      <button
        type="button"
        data-slot="foldable-section-heading"
        aria-expanded={!folded}
        aria-controls={id}
        disabled={forceOpen}
        className={`flex w-full items-center justify-between gap-1 text-left hover:text-foreground disabled:hover:text-inherit ${headingClassName}`}
        onClick={() => folds.toggle(name)}
      >
        <span>{name}</span>
        <Icon
          path={mdiChevronDown}
          size="14px"
          className={`shrink-0 transition-transform ${folded ? '-rotate-90' : ''}`}
        />
      </button>
      <div id={id} data-slot="foldable-section-rows" hidden={folded} className={rowsClassName}>
        {children}
      </div>
    </section>
  );
}
