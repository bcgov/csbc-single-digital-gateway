import { Link } from '@tanstack/react-router';
import { Icon } from '@mdi/react';
import { mdiSlashForward } from '@mdi/js';

/** A simple breadcrumb trail. Client-side router links so a crumb click doesn't reload the app. */
export function Breadcrumb({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 leading-normal">
        {trail.map((crumb, i) => (
          <li key={`${crumb.label}-${i}`} className="flex items-center gap-2">
            {i > 0 ? <Icon path={mdiSlashForward} size="16px" aria-hidden={true} /> : null}
            {crumb.href ? (
              <Link
                to={crumb.href}
                className="rounded-sm outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
              >
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-bold">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
