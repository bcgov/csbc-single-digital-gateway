import { render, type RenderResult } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { FormStudio } from '../src/studio';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from '../src/studio/sample';

type StudioProps = ComponentProps<typeof FormStudio>;

/**
 * Renders `FormStudio` on the built-in sample document (doc 200 rule 24).
 *
 * NAMED `renderSeededStudio`, not `renderStudio`: a dozen test files already declare their own local
 * `function renderStudio()` wrapper, and an import of that name shadows — or is shadowed by — the local one, which
 * silently turns the local helper into a recursive call returning the wrong shape.
 *
 * Doc 200 rule 23 changed the default: a bare `<FormStudio />` now opens the New form dialog instead of seeding the
 * sample, because the studio no longer originates a document. Every test that is about something ELSE — docks, the
 * palette, the inspector, breadcrumbs, selection, the code panel, focus — needs a document to work on and should say
 * so explicitly through this helper, rather than depending on a default that is now about form CREATION.
 *
 * Seeding also keeps those tests on the fast path: a seeded document is `ready` at once (rule 2), with no dialog, no
 * effect and nothing async to wait for.
 *
 * Tests that are about the default, the dialog, loading or the empty state must NOT use this — they render
 * `FormStudio` directly so they see the real no-props behaviour.
 */
export function renderSeededStudio(props: StudioProps = {}): RenderResult {
  return render(
    <FormStudio schema={STUDIO_SAMPLE_SCHEMA} uischema={STUDIO_SAMPLE_UISCHEMA} {...props} />,
  );
}

/** The sample document, for a test that needs to assert against what `renderStudio` seeded. */
export const SAMPLE_DOCUMENT = {
  schema: STUDIO_SAMPLE_SCHEMA,
  uischema: STUDIO_SAMPLE_UISCHEMA,
} as const;
