import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useSetPageChrome } from '@/lib/page-chrome';
import { ServiceBuilderBreadcrumb } from './service-builder-breadcrumb';

/** In-shell wrapper for the nested application-method builders. Sets the top-bar title/description + the
 * breadcrumb bar. When editable, the builder fills the whole center area and owns its own header
 * (status pill + Save/Cancel live in the builder's header). When `readOnly` (the form isn't a draft)
 * it frames a read-only preview with a status pill, a Back button, and a hint (feature 44/47). */
export function ApplicationShell({
  slug,
  serviceId,
  serviceTitle,
  label,
  status,
  readOnly = false,
  children,
}: {
  slug: string;
  serviceId: string;
  serviceTitle: string;
  label: string;
  status?: string;
  readOnly?: boolean;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  // Drive the shell chrome. `description` tracks the (async) service title so the breadcrumb re-pushes.
  useSetPageChrome({
    title: label,
    description: `Application method of ${serviceTitle}`,
    breadcrumb: (
      <ServiceBuilderBreadcrumb
        slug={slug}
        serviceId={serviceId}
        serviceTitle={serviceTitle}
        label={label}
      />
    ),
  });

  if (!readOnly) {
    // The builder fills the entire center area and renders its own header (status + Save/Cancel).
    return <div className="h-full">{children}</div>;
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        {status ? <Badge variant="outline">{status}</Badge> : <span />}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            navigate({ to: '/app/$slug/services/$id', params: { slug, id: serviceId } })
          }
        >
          Back
        </Button>
      </div>
      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        This form is {status ?? 'not editable'} and can’t be changed. Add a new service version to
        make changes.
      </p>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        {children}
      </div>
    </div>
  );
}
