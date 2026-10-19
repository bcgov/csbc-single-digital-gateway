import type { ReactNode } from 'react';

interface MessageCardProps {
  /** Heading text. Omit for a message that's just a line of copy (e.g. an empty state). */
  title?: string;
  /**
   * `1` when the card stands in for the whole page body (not-found, unavailable) so it carries the
   * page's only `<h1>`; `2` when a {@link PageHeaderBanner} above already renders one.
   */
  headingLevel?: 1 | 2;
  /** A decorative icon above the title. */
  icon?: ReactNode;
  /** Buttons/links, laid out in a centered wrapping row under the message. */
  actions?: ReactNode;
  /** The message copy — inline content only; it's rendered inside a <p>. */
  children?: ReactNode;
}

/**
 * A centered, bordered card for a page-level message that replaces normal content: not found,
 * unavailable, a success confirmation, an empty list. Place it inside {@link PageContent}. For the
 * signed-out case use {@link LoginGate}, which composes this.
 */
export function MessageCard({
  title,
  headingLevel = 1,
  icon,
  actions,
  children,
}: MessageCardProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
      {icon}
      {title ? <Heading className="text-xl font-semibold text-foreground">{title}</Heading> : null}
      {children ? <p className="text-sm text-muted-foreground">{children}</p> : null}
      {actions ? <div className="mt-2 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </div>
  );
}
