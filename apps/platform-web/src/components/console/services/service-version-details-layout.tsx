import { Outlet } from '@tanstack/react-router';
import { ServiceDetailsPage } from './service-details-page';

/**
 * The version-permalink Service details route (feature 175).
 *
 * The page renders here and the `<Outlet/>` holds the windowed section editor
 * (`…/details/edit/$sectionId`), so opening a section leaves the page mounted behind the dialog
 * instead of the leaf route re-rendering it — a tidier variant of the modal-leaf pattern used by
 * `ApplicationMethodModal`.
 *
 * Only the version permalink is split this way. The canonical `…/details` route always resolves the
 * PUBLISHED version, which can never be edited, so it needs no editor outlet.
 */
export function ServiceVersionDetailsLayout() {
  return (
    <>
      <ServiceDetailsPage />
      <Outlet />
    </>
  );
}
