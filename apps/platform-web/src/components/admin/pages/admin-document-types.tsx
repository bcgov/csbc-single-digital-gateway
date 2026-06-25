import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@repo/ui/empty';

/** Admin → Document Types — placeholder; the real management UI is the next admin feature. */
export function AdminDocumentTypes() {
  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-4">
      <div className="rounded-xl border border-border bg-card">
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyTitle>No document types yet</EmptyTitle>
            <EmptyDescription>
              Document type definitions available to workspaces will be managed here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </div>
  );
}
