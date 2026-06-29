import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/breadcrumb';
import { Link } from '@tanstack/react-router';

/** Breadcrumb for the in-service form/stage builder routes: Services / <service> / <label>. */
export function ServiceBuilderBreadcrumb({
  slug,
  serviceId,
  serviceTitle,
  label,
}: {
  slug: string;
  serviceId: string;
  serviceTitle: string;
  label: string;
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link to="/app/$slug/services" params={{ slug }} />}>
            Services
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink
            render={<Link to="/app/$slug/services/$id" params={{ slug, id: serviceId }} />}
          >
            {serviceTitle}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
