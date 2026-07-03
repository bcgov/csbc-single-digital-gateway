import type { ReactNode } from 'react';
import { mdiOpenInNew } from '@mdi/js';
import { Icon } from '@mdi/react';

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function ExternalLink({ href, children, className }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2${className ? ` ${className}` : ''}`}
    >
      <span className="truncate">{children}</span>
      <Icon path={mdiOpenInNew} size="16px" className="shrink-0" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
