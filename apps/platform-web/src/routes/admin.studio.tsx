import { createFileRoute } from '@tanstack/react-router';
import { FormStudioPage } from '@/components/admin/pages/form-studio-page';

/** `/admin/studio?form=<id>` — which Form of a Flow the studio is drilled into (doc 197 rule 21). */
export interface StudioSearch {
  form?: string;
}

/**
 * Doc 197 rule 21: coerces unknown search input into the studio's params. The key is omitted entirely
 * when it is absent or empty — `exactOptionalPropertyTypes` forbids an explicit `undefined`, and an
 * empty `?form=` addresses nothing.
 */
export function validateStudioSearch(search: Record<string, unknown>): StudioSearch {
  const form = search['form'];
  return typeof form === 'string' && form !== '' ? { form } : {};
}

/** Doc 197 rule 23: the search params for `formId` — no key at all for the Flow itself. */
export function studioSearchFor(formId: string | null): StudioSearch {
  return formId === null ? {} : { form: formId };
}

/**
 * Doc 197 rules 22-23: the only adapter between the router and the studio. `@repo/forms` knows nothing about TanStack
 * Router; it reports where focus is, and this maps that onto the URL — replacing the history entry when the studio is
 * correcting an address that never resolved, and pushing when the author actually moved.
 */
function StudioRoute() {
  const { form } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <FormStudioPage
      focusedForm={form ?? null}
      onFocusedFormChange={(formId, { replace }) =>
        navigate({ search: () => studioSearchFor(formId), replace })
      }
    />
  );
}

export const Route = createFileRoute('/admin/studio')({
  validateSearch: validateStudioSearch,
  component: StudioRoute,
});
