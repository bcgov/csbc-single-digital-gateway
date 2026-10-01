import { Button } from '@repo/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@repo/ui/empty';

/** What the content area shows until a new document's type and kind are chosen. */
export function DocumentStudioEmpty({ onNewDocument }: { onNewDocument: () => void }) {
  return (
    <Empty data-slot="document-studio-empty">
      <EmptyHeader>
        <EmptyTitle>Create a new document to get started!</EmptyTitle>
        <EmptyDescription>
          Choose what kind of document to create to start editing.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onNewDocument}>New document</Button>
      </EmptyContent>
    </Empty>
  );
}
