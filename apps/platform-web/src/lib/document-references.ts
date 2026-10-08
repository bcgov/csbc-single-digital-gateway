/**
 * The console's documents for a document reference control (doc 287): the `DocumentReferenceSource` port
 * `@repo/documents` asks for, built on the BFF clients. Services come from the referenceable list (this workspace's,
 * plus published ones elsewhere), agreements from the workspace + global list, templates from the published catalog
 * by type; application methods and agreements are created in this workspace.
 */
import type { DocumentReferenceSource, ReferenceCandidate } from '@repo/documents/studio';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { createForm, deleteForm } from '@/lib/forms';
import { agreementsQueryOptions, createAgreement } from '@/lib/service-agreements';
import { referenceableServicesQueryOptions } from '@/lib/services';
import { publishedTemplatesQueryOptions } from '@/lib/templates';

export interface ReferenceHost {
  /** The workspace the document being edited belongs to. */
  workspaceId: string;
  /** Its slug, for links. */
  slug: string;
  /** The document being edited — never offered as a reference to itself. */
  documentId?: string | undefined;
}

const matches = (title: string | null, q: string) =>
  q === '' || (title ?? '').toLowerCase().includes(q.toLowerCase());

/** The source over `client` for `host` — pure, so it can be tested without React. */
export function documentReferenceSource(
  client: QueryClient,
  host: ReferenceHost,
): DocumentReferenceSource {
  const { workspaceId, slug, documentId } = host;
  return {
    async candidates(type, { q }): Promise<ReferenceCandidate[]> {
      if (type === 'services.service') {
        const page = await client.fetchQuery(
          referenceableServicesQueryOptions(workspaceId, {
            q,
            ...(documentId !== undefined && { excludeId: documentId }),
          }),
        );
        return page.items;
      }
      if (type === 'services.service-agreement') {
        const agreements = await client.fetchQuery(agreementsQueryOptions(workspaceId));
        return agreements
          .filter((agreement) => matches(agreement.title, q))
          .map((agreement) => ({
            id: agreement.id,
            title: agreement.title,
            workspaceId: agreement.workspaceId,
            workspaceName: agreement.isGlobal ? 'All workspaces' : null,
            status: agreement.status,
          }));
      }
      // Application methods are only ever created (doc 287 rule 3).
      return [];
    },
    async templates(type) {
      const items = await client.fetchQuery(publishedTemplatesQueryOptions(type));
      return items
        .filter((item) => item.template.type === type)
        .map((item) => ({
          id: item.template.id,
          title: item.published.title ?? 'Untitled template',
        }));
    },
    async create(type, { title, templateId }) {
      if (type === 'services.service-application-method') {
        const { form } = await createForm({ workspaceId, title, templateId });
        return { id: form.id, title: form.title ?? title, workspaceId: form.workspaceId };
      }
      if (type === 'services.service-agreement') {
        const { agreement } = await createAgreement({ workspaceId, title, templateId });
        await client.invalidateQueries({ queryKey: ['service-agreements'] });
        return {
          id: agreement.id,
          title: agreement.title ?? title,
          workspaceId: agreement.workspaceId,
        };
      }
      throw new Error(`A ${type} can't be created from a reference`);
    },
    async remove(type, id) {
      if (type !== 'services.service-application-method')
        throw new Error(`A ${type} is never deleted from a reference`);
      await deleteForm(id);
    },
    href(type, reference) {
      // Doc 287 rule 18: only documents in this workspace have a console page the author can open.
      if (reference.workspaceId !== workspaceId) return undefined;
      const id = encodeURIComponent(reference.id);
      if (type === 'services.service') return `/app/${slug}/services/${id}`;
      if (type === 'services.service-agreement') return `/app/${slug}/service-agreements/${id}`;
      return undefined;
    },
  };
}

/** `documentReferenceSource` for the page's query client, stable while the host is. */
export function useDocumentReferenceSource(host: ReferenceHost): DocumentReferenceSource {
  const client = useQueryClient();
  const { workspaceId, slug, documentId } = host;
  return useMemo(
    () => documentReferenceSource(client, { workspaceId, slug, documentId }),
    [client, workspaceId, slug, documentId],
  );
}
