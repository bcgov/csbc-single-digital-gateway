import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Spinner } from '@repo/ui/spinner';
import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useSetPageChrome } from '@/lib/page-chrome';
import { ServiceBuilderBreadcrumb } from './service-builder-breadcrumb';

/** In-shell wrapper for the nested application-method builders: sets the top-bar title/description +
 * the breadcrumb bar, and frames the builder with a toolbar. When `readOnly` (the form isn't a draft)
 * the Save action is hidden and a hint explains how to make changes (feature 44/47). */
export function ApplicationShell({
  slug,
  serviceId,
  serviceTitle,
  label,
  description,
  status,
  readOnly = false,
  onSave,
  saving = false,
  error = null,
  titleSlot,
  children,
}: {
  slug: string;
  serviceId: string;
  serviceTitle: string;
  label: string;
  description: string;
  status?: string;
  readOnly?: boolean;
  onSave?: () => void;
  saving?: boolean;
  error?: Error | null;
  titleSlot?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const toDetail = () =>
    navigate({ to: '/app/$slug/services/$id', params: { slug, id: serviceId } });
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
        <div className="flex min-w-0 items-center gap-3">
          {status ? <Badge variant="outline">{status}</Badge> : null}
          <div className="min-w-0">{titleSlot}</div>
        </div>
        <div className="flex items-center gap-3">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          ) : null}
          <Button type="button" variant="outline" onClick={() => toDetail()}>
            {readOnly ? 'Back' : 'Cancel'}
          </Button>
          {readOnly ? null : (
            <Button type="button" disabled={saving} onClick={() => onSave?.()}>
              {saving ? <Spinner className="size-4" /> : null}
              Save form
            </Button>
          )}
        </div>
      </div>
      {readOnly ? (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          This form is {status ?? 'not editable'} and can’t be changed. Add a new service version to
          make changes.
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        {children}
      </div>
    </div>
  );
}
