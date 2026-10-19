import type { ReactNode } from 'react';

/**
 * The page's single `<h1>`, in the standard title style. Render it inside {@link PageHeaderBanner}'s
 * children (or let {@link SettingsPageHeader} render it for you) rather than styling an `h1` per page.
 */
export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-semibold text-foreground">{children}</h1>;
}
