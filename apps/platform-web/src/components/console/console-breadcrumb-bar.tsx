import { usePageChrome } from '@/lib/page-chrome';

/** Full-width breadcrumb bar shown directly below the top bar on nested pages (feature 44). Renders
 * nothing on plain top-level sections (no chrome / no breadcrumb). */
export function ConsoleBreadcrumbBar() {
  const chrome = usePageChrome();
  if (!chrome?.breadcrumb) {
    return null;
  }
  return (
    <div className="flex h-10 shrink-0 items-center border-b border-border bg-background px-4">
      {chrome.breadcrumb}
    </div>
  );
}
