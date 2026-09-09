import type { ComponentUsageMetadata } from '@repo/ui/catalog-types';
import uiCatalog from '@repo/ui/component-catalog.json';
import pageContentCatalog from './page-content.catalog';

// Components documented in this app but not owned by @repo/ui (app-local layout templates) — too
// few to warrant their own generator, same reasoning as
// apps/citizen-portal-web/src/a11y/a11y-catalog.ts's appLocalCatalog.
const appLocalCatalog: ComponentUsageMetadata[] = [pageContentCatalog];

const catalog: ComponentUsageMetadata[] = [
  ...(uiCatalog as ComponentUsageMetadata[]),
  ...appLocalCatalog,
];

/** `undefined` for a component with no catalog entry yet — absence is not "anything goes"; callers
 *  (e.g. the `/build-page` skill) should treat a missing entry the same as {@link isFrozen}'s
 *  default: ask before touching it, don't assume it's safe to compose or modify freely. */
export function findComponentMetadata(component: string): ComponentUsageMetadata | undefined {
  return catalog.find((entry) => entry.component === component);
}

/** Whether a component requires the repo owner's explicit sign-off before being modified. A
 *  component with no catalog entry yet is treated as frozen — the safe default over assuming a
 *  gap in coverage means it's fine to change. */
export function isFrozen(component: string): boolean {
  const metadata = findComponentMetadata(component);
  return metadata ? metadata.status === 'frozen' : true;
}

export function listComponentCatalog(): readonly ComponentUsageMetadata[] {
  return catalog;
}
