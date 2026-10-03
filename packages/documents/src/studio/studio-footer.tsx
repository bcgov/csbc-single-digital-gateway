import type { ReactNode } from 'react';
import { SelectionBreadcrumbs } from './selection-breadcrumbs';
import type { PathSegment } from './selection-path';
import type { StudioStatus } from './use-document-studio';

/** What the content area shows, without a document, for statuses other than `new`. */
export const STATUS_VIEWS: Partial<Record<StudioStatus, ReactNode>> = {
  loading: <StatusMessage>Loading document…</StatusMessage>,
  'not-found': <StatusMessage>Document not found.</StatusMessage>,
};

function StatusMessage({ children }: { children: ReactNode }) {
  return (
    <p className="m-auto text-sm text-muted-foreground" data-slot="document-studio-status">
      {children}
    </p>
  );
}

export function StudioFooter({
  path,
  onSelect,
  saveError,
}: {
  path: PathSegment[] | null;
  onSelect: (formId: string | null) => void;
  saveError: string | null;
}) {
  return (
    <footer
      data-slot="document-studio-footer"
      className="flex h-9 shrink-0 items-center gap-2 border-t border-border px-2 text-xs"
    >
      {path !== null && <SelectionBreadcrumbs segments={path} onSelect={onSelect} />}
      {saveError !== null && (
        <span role="alert" className="ml-auto text-destructive">
          {saveError}
        </span>
      )}
    </footer>
  );
}
