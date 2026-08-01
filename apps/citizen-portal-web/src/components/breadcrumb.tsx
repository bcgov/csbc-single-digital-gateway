import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';

/** A simple breadcrumb trail. Client-side router links so a crumb click doesn't reload the app. */
export function Breadcrumb({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {trail.map((crumb, i) => (
          <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="size-3" aria-hidden /> : null}
            {crumb.href ? (
              <Link to={crumb.href} className="hover:text-foreground hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
