import type { ComponentProps, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import { RichTextView } from '@repo/ui/rich-text-view';

/** The Lexical value `RichTextView` renders — reused by callers that pass agreement content. */
export type AgreementContent = ComponentProps<typeof RichTextView>['value'];

/**
 * Read-only presentational card for a service agreement: title (+ an optional header aside such as a
 * Required/Optional label or an Approved badge), an optional description, and the staff-authored
 * Lexical content. Shared by the consent gate (feature 90 — passes approve/reject radios as
 * `children`) and the service-agreement detail page (feature 139 — read-only, no children).
 */
export function AgreementCard({
  title,
  description,
  content,
  aside,
  divided = false,
  children,
}: {
  title: string;
  description?: string | null;
  content: AgreementContent;
  /**
   * Rendered at the END of the title row — right-aligned on `sm+`, stacked under the title on small
   * screens (e.g. a Required/Optional label or an "Approved on …" status).
   */
  aside?: ReactNode;
  /** Draw a divider between the header and the content (used by the read-only detail view). */
  divided?: boolean;
  /** Extra content below the agreement body (e.g. the consent radios). */
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span>{title}</span>
          {aside}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {divided ? <div className="border-t border-border" aria-hidden={true} /> : null}
        {content ? <RichTextView value={content} /> : null}
        {children}
      </CardContent>
    </Card>
  );
}
