import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ExternalLink, FileText, Layers, type LucideIcon } from 'lucide-react';
import { createReferencedForm, formTypesQueryOptions } from '@/lib/services';

interface Method {
  id: 'basic-form' | 'multi-stage-form';
  title: string;
  description: string;
  icon: LucideIcon;
  defaultTitle: string;
}

const METHODS: Method[] = [
  {
    id: 'basic-form',
    title: 'Basic form',
    description: 'A single page of fields applicants complete and submit in one go.',
    icon: FileText,
    defaultTitle: 'Untitled',
  },
  {
    id: 'multi-stage-form',
    title: 'Multi-stage form',
    description: 'A guided flow split into stages, with conditional logic between them.',
    icon: Layers,
    defaultTitle: 'Untitled multi-stage form',
  },
];

const FROM = '/app/$slug/services/$id/versions/$versionId/application-methods/new';

/** "New application method" modal (service detail). Picking a method CREATES a barebones form +
 * reference on the server, then navigates to that method's edit page (feature 45). External: no link. */
export function ApplicationMethodModal() {
  const { slug, id, versionId } = useParams({ from: FROM });
  const { data: formTypes = [] } = useQuery(formTypesQueryOptions());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const close = () => navigate({ to: '/app/$slug/services/$id', params: { slug, id } });
  const create = useMutation({
    mutationFn: (method: Method) => {
      const type = formTypes.find((t) => t.kind === method.id);
      if (type === undefined) {
        throw new Error(`${method.title} type unavailable`);
      }
      return createReferencedForm(id, versionId, {
        typeId: type.typeId,
        title: method.defaultTitle,
        label: method.defaultTitle,
      });
    },
    onSuccess: async (reference) => {
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      await navigate({
        to: '/app/$slug/services/$id/versions/$versionId/application-methods/$applicationMethodId',
        params: { slug, id, versionId, applicationMethodId: reference.targetDocumentId },
      });
    },
  });

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !create.isPending) {
          void close();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New application method</DialogTitle>
          <DialogDescription>Choose how applicants apply for this service.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {METHODS.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                type="button"
                disabled={create.isPending}
                onClick={() => create.mutate(method)}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary disabled:opacity-60"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {create.isPending && create.variables?.id === method.id ? (
                    <Spinner className="size-[18px]" />
                  ) : (
                    <Icon className="size-[18px]" aria-hidden />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {method.title}
                  </span>
                  <span className="block text-sm text-muted-foreground">{method.description}</span>
                </span>
              </button>
            );
          })}
          {/* External link — not wired up yet. */}
          <div
            aria-disabled
            className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-left opacity-70"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <ExternalLink className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                External link
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                  Coming soon
                </span>
              </span>
              <span className="block text-sm text-muted-foreground">
                Send applicants to a form or service hosted elsewhere.
              </span>
            </span>
          </div>
          {create.error ? (
            <p role="alert" className="text-sm text-destructive">
              {create.error.message}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
