import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import { mdiChevronRight } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Link } from '@tanstack/react-router';
import type { CatalogService } from '@/lib/catalog';

/**
 * A navigational service card, shared by the home "Available services" panel and the "/services"
 * catalog grid. The **whole card** is a click/tap target to the service detail page (a stretched
 * `after:absolute inset-0` overlay on the title link), yet only the title is the accessible link
 * text and only the title underlines on hover — the description is a plain sibling that is never
 * underlined. Keyboard focus lands on the title link and surfaces a ring on the card.
 */
export function ServiceCard({ service }: { service: CatalogService }) {
  return (
    <Card className="group relative h-full transition-shadow hover:ring-primary/40 focus-within:ring-[3px] focus-within:ring-ring/50">
      <CardHeader>
        <CardTitle className="flex items-start justify-between gap-2 text-base font-semibold">
          <Link
            to="/services/$serviceId"
            params={{ serviceId: service.id }}
            className="no-underline group-hover:underline after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none"
          >
            {service.title}
          </Link>
          <Icon
            path={mdiChevronRight}
            size="20px"
            className="mt-0.5 shrink-0 text-link"
            aria-hidden={true}
          />
        </CardTitle>
        <CardDescription className="line-clamp-2">{service.description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
