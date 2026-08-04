import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Console top-bar title/description + the full-width breadcrumb bar for a nested page. */
export interface PageChrome {
  title: string;
  description?: string | undefined;
  breadcrumb?: ReactNode;
}

interface Entry {
  id: string;
  chrome: PageChrome;
}

interface PageChromeApi {
  chrome: PageChrome | null;
  push: (id: string, chrome: PageChrome) => void;
  remove: (id: string) => void;
}

export const PageChromeContext = createContext<PageChromeApi | null>(null);

/** Holds a STACK of chrome entries — a child page (e.g. a builder) overlays its parent (the detail),
 * and removing it on unmount restores the parent's chrome. Updates are in place (order preserved). */
export function PageChromeProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Entry[]>([]);
  const push = useCallback((id: string, chrome: PageChrome) => {
    setStack((prev) =>
      prev.some((entry) => entry.id === id)
        ? prev.map((entry) => (entry.id === id ? { id, chrome } : entry))
        : [...prev, { id, chrome }],
    );
  }, []);
  const remove = useCallback((id: string) => {
    setStack((prev) => prev.filter((entry) => entry.id !== id));
  }, []);
  const chrome = stack.at(-1)?.chrome ?? null;
  const value = useMemo<PageChromeApi>(() => ({ chrome, push, remove }), [chrome, push, remove]);
  return <PageChromeContext.Provider value={value}>{children}</PageChromeContext.Provider>;
}

/** The active page chrome (top of the stack), or null on a plain top-level section. */
export function usePageChrome(): PageChrome | null {
  return useContext(PageChromeContext)?.chrome ?? null;
}

/** Register this page's chrome while it's mounted (cleared on unmount). `breadcrumb` is captured by
 * the effect closure and re-pushed whenever `title`/`description` change (they track the same data). */
export function useSetPageChrome({ title, description, breadcrumb }: PageChrome): void {
  const ctx = useContext(PageChromeContext);
  // Grab the STABLE callbacks — depending on the whole context value would re-fire this effect on
  // every push (the value changes when the active chrome changes) → infinite update loop.
  const push = ctx?.push;
  const remove = ctx?.remove;
  const id = useId();
  useEffect(() => {
    push?.(id, { title, description, breadcrumb });
    return () => remove?.(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- breadcrumb tracks title/description; push/remove are stable
  }, [push, remove, id, title, description]);
}
