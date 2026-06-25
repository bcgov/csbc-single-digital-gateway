import { Button } from '@repo/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@repo/ui/empty';
import { Link } from '@tanstack/react-router';

/** Shown when `/app/:slug` resolves to a workspace the caller can't see (404 from the API). */
export function WorkspaceNotFound() {
  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center gap-5 py-20">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Workspace not found</EmptyTitle>
          <EmptyDescription>
            It may have been deleted, or you don&rsquo;t have access to it.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
      <Button render={<Link to="/app" />}>Back to your workspaces</Button>
    </div>
  );
}
