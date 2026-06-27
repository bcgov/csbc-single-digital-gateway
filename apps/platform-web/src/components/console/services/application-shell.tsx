import { Button } from '@repo/ui/button';
import { Spinner } from '@repo/ui/spinner';
import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useSetPageChrome } from '@/lib/page-chrome';
import { ServiceBuilderBreadcrumb } from './service-builder-breadcrumb';

/** In-shell wrapper for the nested application-method builders: sets the top-bar title/description +
 * the breadcrumb bar, and frames the builder with a Save/Cancel toolbar (feature 44). */
export function ApplicationShell({
  slug,
  serviceId,
  serviceTitle,
  label,
  description,
  onSave,
  saving,
  error,
  titleSlot,
  children,
}: {
  slug: string;
  serviceId: string;
  serviceTitle: string;
  label: string;
  description: string;
  onSave: () => void;
  saving: boolean;
  error: Error | null;
  titleSlot?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  // Drive the shell chrome. `description` tracks the (async) service title so the breadcrumb re-pushes.
  useSetPageChrome({
    title: label,
    description,
    breadcrumb: (
      <ServiceBuilderBreadcrumb
        slug={slug}
        serviceId={serviceId}
        serviceTitle={serviceTitle}
        label={label}
      />
    ),
  });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">{titleSlot}</div>
        <div className="flex items-center gap-3">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({ to: '/app/$slug/services/$id', params: { slug, id: serviceId } })
            }
          >
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={onSave}>
            {saving ? <Spinner className="size-4" /> : null}
            Save form
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        {children}
      </div>
    </div>
  );
}
