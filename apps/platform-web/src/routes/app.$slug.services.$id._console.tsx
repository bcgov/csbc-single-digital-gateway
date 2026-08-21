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

  // The shell fills the content area EXACTLY (`h-` not `min-h-`) and the section column is the
  // scroller, so the sidebar stays put. With `min-h-full` the shell grew to content height and the
  // sidebar — a stretched flex child — scrolled away with it, leaving an empty column tracking
  // alongside the content: one scroll region that read as two.
  return (
    <div className="-m-6 flex h-[calc(100%+3rem)]">
      <ServiceSidebar slug={slug} id={id} serviceName={serviceTitle} />
      {/* `relative` on the SCROLL CONTAINER is load-bearing. Tailwind's `sr-only` is
          `position: absolute` with no offsets, so it is only contained by a positioned ancestor.
          Without this it resolves against the initial containing block — landing far down the page
          in the scrolled content's coordinate space — and adds real layout overflow to whatever
          ancestor does contain it, which then scrolls the whole app on an anchor jump. Contained
          here, each span sits exactly where it renders and adds no overflow at all. */}
      <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto p-6">
        <Outlet />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/app/$slug/services/$id/_console')({
  component: ServiceConsoleShell,
});
