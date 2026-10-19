import type { ReactNode } from 'react';
import { Skeleton } from '@repo/ui/skeleton';

/** Skeleton shapes per page template — a title line, then a block roughly the size of the body. */
const SHAPES = {
  content: (
    <>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32 w-full" />
    </>
  ),
  settings: (
    <>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
    </>
  ),
  detail: (
    <>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-full max-w-lg" />
    </>
  ),
} satisfies Record<string, ReactNode>;

/**
 * The standard loading placeholder for a page body, so every page shows the same skeleton shape
 * while its data (or the session) resolves. Place it inside {@link PageContent}.
 */
export function PageLoading({ variant = 'content' }: { variant?: keyof typeof SHAPES }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {SHAPES[variant]}
    </div>
  );
}
