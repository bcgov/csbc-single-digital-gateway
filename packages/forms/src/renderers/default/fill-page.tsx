import { createContext, useContext, type ReactNode } from 'react';

// The fillable page's size container (doc 184 rule 17b). PURE React — no gridstack, no xyflow — so `renderers/default`
// and the runner may both import it.
//
// Fillable layouts respond to the width of the PAGE they sit in, not the browser window: every responsive class is a
// `@min-[40rem]/fill-page:` container query (40rem is Tailwind's `sm`, so the threshold is unchanged). That is what
// lets the studio's Tablet / Mobile preview frames show the narrow layout inside a desktop window, and it is also the
// honest behaviour for a form embedded in a page column.
//
// The container is NAMED and declared ONCE, at the outermost fillable root. Nearest-box queries would measure each
// layout's own parent instead — a Form's `px-12` inset and the runner's rail would then drop a desktop page into one
// column. So the first `FillPage` down the tree declares it, and every one beneath it renders its children bare.

const FillPageContext = createContext(false);

/** Wraps `children` in the `fill-page` container unless an ancestor already declared one. */
export function FillPage({
  children,
  className = '',
}: {
  readonly children: ReactNode;
  /** Classes for the container element; ignored when an ancestor owns the container. */
  readonly className?: string;
}) {
  const inside = useContext(FillPageContext);
  if (inside) return children;
  return (
    <FillPageContext.Provider value>
      <div data-slot="fill-page" className={`@container/fill-page ${className}`}>
        {children}
      </div>
    </FillPageContext.Provider>
  );
}
