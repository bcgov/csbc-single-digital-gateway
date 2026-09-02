import { PageHeader as UiPageHeader } from '@repo/ui/page-header';
import type { ComponentProps } from 'react';

export { PageBody } from '@repo/ui/page-header';

type UiPageHeaderProps = ComponentProps<typeof UiPageHeader>;

/** The console's header takes everything the shared one does except the chrome knob. */
type ConsolePageHeaderProps = Omit<UiPageHeaderProps, 'variant'>;

/**
 * The console page header (feature 162) — now a thin wrapper over `@repo/ui/page-header`
 * (promoted in feature 176).
 *
 * The shared component defaults to `variant="plain"` because it is rendered in form panes too,
 * where the console's full-window bleed would tear through the pane edges. The console's own
 * treatment — `-mx-6 -mt-6` past the `<main>` padding plus the `bcgov-gold` divider — is exactly
 * what every console page already expects, so this wrapper pins `variant="banner"` and the seven
 * call sites keep their import specifier, their props, and their rendering unchanged.
 *
 * `variant` is intentionally NOT forwardable: a console page rendering a plain header would break
 * the shell's full-width divider run. Reach for `@repo/ui/page-header` directly if you need that.
 */
export function PageHeader(props: ConsolePageHeaderProps) {
  return <UiPageHeader {...props} variant="banner" />;
}
