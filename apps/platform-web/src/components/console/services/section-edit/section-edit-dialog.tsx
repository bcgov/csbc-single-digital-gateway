import { findEditableSection } from '@repo/react/uischema-edit';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Spinner } from '@repo/ui/spinner';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import {
  definitionForServiceVersion,
  selectServiceVersion,
  serviceQueryOptions,
} from '@/lib/services';
import { SECTION_EDITORS } from './editors';
import { SubtreeSectionEditor } from './subtree-editor';

export const SECTION_EDIT_ROUTE =
  '/app/$slug/services/$id/_console/versions/$versionId/details/edit/$sectionId';

/**
 * The windowed section edit flow (feature 175) — a modal leaf over the Service details page.
 *
 * The route IS the open state, so the dialog is always `open` and closing navigates back to the
 * details page with the section's `#hash` (mirrors `ApplicationMethodModal`).
 *
 * It lives only under the VERSION PERMALINK subtree on purpose: `selectServiceVersion(versions,
 * undefined)` resolves the published version, so the canonical `…/details` URL can never show a
 * draft — and `updateDraft` 409s on anything but a draft.
 *
 * Every unresolvable case renders a plain message rather than an editor: a stale link, a reshaped
 * definition that dropped the section, or an `editor` key with nothing registered against it. A
 * silently blank window would look like a load that never finished.
 */
export function SectionEditDialog() {
  const { slug, id, versionId, sectionId } = useParams({ from: SECTION_EDIT_ROUTE });
  const navigate = useNavigate();
  const { data: detail, isPending, isError } = useQuery(serviceQueryOptions(id));

  const close = () => {
    void navigate({
      to: '/app/$slug/services/$id/versions/$versionId/details',
      params: { slug, id, versionId },
      hash: sectionId,
    });
  };

  const version = selectServiceVersion(detail?.versions ?? [], versionId);
  const definition = definitionForServiceVersion(detail, versionId);
  const section =
    definition === undefined ? undefined : findEditableSection(definition.uischema, sectionId);

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

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) {
          close();
        }
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {section === undefined || section.label === '' ? 'Edit section' : section.label}
          </DialogTitle>
          <DialogDescription>
            Changes are saved to this draft version. Publish the version to make them public.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">{body()}</div>
      </DialogContent>
    </Dialog>
  );
}

function Message({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
