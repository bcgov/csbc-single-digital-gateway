import { Button, buttonVariants } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import type { DocumentReferenceSource } from '@repo/documents/studio';
import { Link } from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';
import type { CatalogApplicationMethod } from '@/lib/catalog';

/** Doc 291: where a citizen fills one of a service's application methods. */
export function applyHref(serviceId: string, methodId: string): string {
  return `/services/${encodeURIComponent(serviceId)}/apply/${encodeURIComponent(methodId)}`;
}

const READ_ONLY = (): Promise<never> =>
  Promise.reject(new Error('The citizen service page only links references'));

/**
 * Doc 291 rule 8: the reference source the citizen service page hands `DocumentView` — read-only (the view never picks,
 * creates or removes), linking only the application methods the catalog listed to their apply page.
 */
export function citizenReferenceSource(
  serviceId: string,
  methods: readonly CatalogApplicationMethod[],
): DocumentReferenceSource {
  const listed = new Set(methods.map((method) => method.id));
  return {
    candidates: READ_ONLY,
    templates: READ_ONLY,
    create: READ_ONLY,
    remove: READ_ONLY,
    href: (type, reference) =>
      type === 'services.service-application-method' && listed.has(reference.id)
        ? applyHref(serviceId, reference.id)
        : undefined,
  };
}

/**
 * Doc 291 rule 9: "Start an application" — disabled with a note when the service has no published method, a link
 * when it has one, and a menu of them when it has several.
 */
export function StartApplication({
  serviceId,
  methods,
}: {
  serviceId: string;
  methods: readonly CatalogApplicationMethod[];
}) {
  const [only] = methods;
  if (only === undefined)
    return (
      <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
        <Button disabled>Start an application</Button>
        <p data-slot="start-application-note" className="text-sm text-muted-foreground">
          Applications are not open yet
        </p>
      </div>
    );
  if (methods.length === 1)
    return (
      <Button
        className="shrink-0"
        render={
          <Link
            to="/services/$serviceId/apply/$methodId"
            params={{ serviceId, methodId: only.id }}
          />
        }
      >
        Start an application
      </Button>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ className: 'shrink-0' })}>
        Start an application
        <ChevronDown className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {methods.map((method) => (
          <DropdownMenuItem
            key={method.id}
            className="flex flex-col items-start gap-0.5"
            render={
              <Link
                to="/services/$serviceId/apply/$methodId"
                params={{ serviceId, methodId: method.id }}
              />
            }
          >
            <span className="font-medium">{method.title ?? 'Untitled application'}</span>
            {method.description ? (
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {method.description}
              </span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
