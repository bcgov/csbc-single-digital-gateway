import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/breadcrumb';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, createFileRoute } from '@tanstack/react-router';
import { ServiceSidebar } from '@/components/console/services/service-sidebar';
import { useSetPageChrome } from '@/lib/page-chrome';
import { serviceQueryOptions } from '@/lib/services';

/**
 * The service console shell (feature 164) — a pathless layout so it wraps only the section pages
 * (Dashboard/Details/Requests/Analytics/Settings); the `/edit` reference editor is a sibling and
 * stays sidebar-free. Cancels `<main>`'s padding (`-m-6`) so the sidebar `border-r` sits flush and
 * full-height, then re-applies `p-6` on the content column so each section's `PageHeader` bleeds to
 * the column edges (not the whole window). Sets the top-bar chrome + breadcrumb for the service.
 */
function ServiceConsoleShell() {
  const { slug, id } = Route.useParams();
  const { data } = useQuery(serviceQueryOptions(id));
  const serviceTitle = data?.service.title ?? 'Service';

  useSetPageChrome({
    title: serviceTitle,
    description: data?.service.description ? data.service.description : undefined,
    breadcrumb: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/app/$slug/services" params={{ slug }} />}>
              Services
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{serviceTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
  });

  return (
    <div className="-m-6 flex min-h-full">
      <ServiceSidebar slug={slug} id={id} serviceName={serviceTitle} />
      <div className="min-w-0 flex-1 p-6">
        <Outlet />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/app/$slug/services/$id/_console')({
  component: ServiceConsoleShell,
});
