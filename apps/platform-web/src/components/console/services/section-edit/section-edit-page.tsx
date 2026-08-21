import { findEditableSection } from '@repo/react/uischema-edit';
import { Spinner } from '@repo/ui/spinner';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import {
  definitionForServiceVersion,
  selectServiceVersion,
  serviceQueryOptions,
} from '@/lib/services';
import { useSetPageChrome } from '@/lib/page-chrome';
import { SECTION_EDITORS } from './editors';
import { SectionEditBreadcrumb } from './section-edit-breadcrumb';
import { SubtreeSectionEditor } from './subtree-editor';

/**
 * The windowed section edit flow (features 175, 176) — a full PAGE, sibling of the `_console` shell.
 *
 * It began as a modal leaf over the details page. Sections grew big enough (the flow-variant
 * Categorization is a four-step wizard) that a dialog was the wrong container, so it became its own
 * sidebar-free page: breadcrumb at the top, the editor below, nothing else competing for width.
 * Being outside `_console` is what drops the service sidebar while keeping the URL identical —
 * `_console` is a pathless layout, so it contributes nothing to the path.
 *
 * **Two URLs, one component.** The version permalink
 * (`…/versions/:versionId/details/edit/:sectionId`) and the canonical
 * (`…/details/edit/:sectionId`) both render this. Params are read loosely because the two routes
 * have different param shapes; `versionId` is simply absent on the canonical one, and
 * `selectServiceVersion(versions, undefined)` then resolves published-else-newest. So a service
 * whose only version is a draft is editable from both URLs, while one with a published version
 * resolves to that published version on the canonical URL and is refused below — the same guard
 * that has always applied, now reached by two paths.
 *
 * Every unresolvable case renders a plain message rather than an editor: a stale link, a reshaped
 * definition that dropped the section, or an `editor` key with nothing registered against it. A
 * silently blank page would look like a load that never finished.
 */
export function SectionEditPage() {
  const params = useParams({ strict: false });
  const slug = params.slug ?? '';
  const id = params.id ?? '';
  const sectionId = params.sectionId ?? '';
  const versionId = params.versionId;

  const navigate = useNavigate();
  const { data: detail, isPending, isError } = useQuery(serviceQueryOptions(id));

  const version = selectServiceVersion(detail?.versions ?? [], versionId);
  const definition = definitionForServiceVersion(detail, versionId);
  const section =
    definition === undefined ? undefined : findEditableSection(definition.uischema, sectionId);

  const serviceTitle = detail?.service.title ?? 'Service';
  const label = section === undefined || section.label === '' ? 'Edit section' : section.label;

  // The breadcrumb bar is the only way back up on a sidebar-free page, so it is set unconditionally
  // — including while the service is still loading and when the section can't be resolved.
  useSetPageChrome({
    title: label,
    description: `Section of ${serviceTitle}`,
    breadcrumb: (
      <SectionEditBreadcrumb
        slug={slug}
        serviceId={id}
        versionId={versionId}
        serviceTitle={serviceTitle}
        label={label}
      />
    ),
  });

  /** Back to the details page the editor was opened from, anchored on the edited section. */
  const close = () => {
    void (versionId === undefined
      ? navigate({
          to: '/app/$slug/services/$id/details',
          params: { slug, id },
          hash: sectionId,
        })
      : navigate({
          to: '/app/$slug/services/$id/versions/$versionId/details',
          params: { slug, id, versionId },
          hash: sectionId,
        }));
  };

  const body = () => {
    if (isPending) {
      return (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      );
    }
    if (isError || detail === undefined || version === undefined || definition === undefined) {
      return <Message>This service version couldn’t be loaded.</Message>;
    }
    if (version.status !== 'draft') {
      return (
        <Message>Only draft versions can be edited. Switch to a draft to make changes.</Message>
      );
    }
    if (section === undefined) {
      return <Message>This section is no longer part of the service definition.</Message>;
    }
    // `editor: null` is subtree mode; a key with nothing registered is an authoring mistake.
    const Editor = section.editor === null ? SubtreeSectionEditor : SECTION_EDITORS[section.editor];
    if (Editor === undefined) {
      return (
        <Message>
          No editor is registered for <code>{section.editor}</code>.
        </Message>
      );
    }
    return (
      <Editor
        section={section}
        schema={definition.schema}
        serviceId={id}
        version={version}
        onClose={close}
      />
    );
  };

  // Full-bleed, full-height: `-m-6` cancels the console `<main>`'s padding and the height adds it
  // back, so the page fills the content area exactly and `<main>` itself never scrolls (the
  // `ApplicationShell` builders do the same). Editing a section wants every pixel of width — the
  // flow layout puts a step rail beside the fields — so nothing here is capped at a reading column.
  //
  // The BODY is the scroll region and carries NO padding. `padding-bottom` in particular must never
  // be added here: a `sticky bottom-0` action bar inside the editor pins against its scrollport's
  // CONTENT box, so padding floats the bar above the edge and lets content show through the gap
  // (which is exactly what the console `<main>`'s own `p-6` did before the page took the scrollport
  // over). Owning it here is what lets the shared renderer keep a plain `sticky bottom-0` instead of
  // compensating for whatever padding its host happens to have.
  return (
    <div className="-m-6 flex h-[calc(100%+3rem)] flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">{body()}</div>
    </div>
  );
}

function Message({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
