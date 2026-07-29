import type { ComponentA11yMetadata } from '@repo/ui/a11y-types';
import uiCatalog from '@repo/ui/a11y-catalog.json';
import formElementsA11y from './form-elements-reference-page.a11y';
import iconA11y from './icon-reference-page.a11y';
import statusBannerA11y from './status-banner.a11y';

// Components documented in this app but not owned by @repo/ui (app-local components, or
// /dev pattern pages with no single owning component) — too few to warrant their own generator.
const appLocalCatalog: ComponentA11yMetadata[] = [statusBannerA11y, iconA11y, formElementsA11y];

const catalog: ComponentA11yMetadata[] = [
  ...(uiCatalog as ComponentA11yMetadata[]),
  ...appLocalCatalog,
];

/** Looks up a documented component's accessibility metadata. Throws on a missing/typo'd
 *  `component` field so a /dev page never silently renders a blank Accessibility section. */
export function getA11yMetadata(component: string): ComponentA11yMetadata {
  const metadata = catalog.find((entry) => entry.component === component);
  if (!metadata) {
    throw new Error(
      `No accessibility metadata found for component "${component}" — check the .a11y.ts sidecar's "component" field and that packages/ui's catalog was regenerated (npm run gen:a11y-catalog -w @repo/ui).`,
    );
  }
  return metadata;
}
