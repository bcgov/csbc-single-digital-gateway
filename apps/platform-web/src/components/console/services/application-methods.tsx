import { Button } from '@repo/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { FileText, Layers, Plus, Trash2 } from 'lucide-react';
import { removeReference, type ServiceReference } from '@/lib/services';

const KIND_LABEL: Record<string, string> = {
  'basic-form': 'Basic form',
  'multi-stage-form': 'Multi-stage form',
};

/** Service-detail "Application methods" — a read list of existing method references (with remove) and
 * an "Add application method" button that opens the route-based create flow (feature 44). */
export function ApplicationMethods({
  slug,
  serviceId,
  versionId,
  references,
  readonly,
}: {
  slug: string;
  serviceId: string;
  versionId: string;
  references: ServiceReference[];
  readonly: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: (referenceId: string) => removeReference(serviceId, versionId, referenceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Application methods</span>
        {readonly ? null : (
          <Button
            size="xs"
            variant="outline"
            type="button"
            onClick={() =>
              navigate({
                to: '/app/$slug/services/$id/versions/$versionId/application-methods/new',
                params: { slug, id: serviceId, versionId },
              })
            }
          >
            <Plus className="size-3.5" aria-hidden />
            Add application method
          </Button>
        )}
      </div>
      {references.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No application methods yet — add a form a user can apply through.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {references.map((ref) => {
            const Icon = ref.targetKind === 'multi-stage-form' ? Layers : FileText;
            return (
              <li
                key={ref.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{ref.targetTitle}</span>
                    <span className="block text-xs text-muted-foreground">
                      {ref.label ? `${ref.label} · ` : ''}
                      {KIND_LABEL[ref.targetKind] ?? ref.targetKind}
                    </span>
                  </span>
                </span>
                {readonly ? null : (
                  <Button
                    size="xs"
                    variant="ghost"
                    type="button"
                    className="text-destructive"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(ref.id)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    Remove
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
