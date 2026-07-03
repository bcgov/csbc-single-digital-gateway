import type { ReactNode } from 'react';
import { mdiChevronDown } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@repo/ui/collapsible';
import { CodeBlock } from '@/components/dev/code-block';

/**
 * Live preview + a "Show code" reveal underneath, the shadcn-docs example pattern. Uses our own
 * Collapsible instead of a Preview/Code tab toggle — one example, one disclosure, no tab state.
 */
export function ExamplePreview({ code, children }: { code: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-background p-6">{children}</div>
      <Collapsible>
        <CollapsibleTrigger className="group/code-toggle flex items-center gap-1.5 text-sm font-medium text-link hover:underline">
          <Icon
            path={mdiChevronDown}
            size="16px"
            className="transition-transform group-data-[panel-open]/code-toggle:rotate-180"
            aria-hidden={true}
          />
          <span className="group-data-[panel-open]/code-toggle:hidden">Show code</span>
          <span className="hidden group-data-[panel-open]/code-toggle:inline">Hide code</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CodeBlock code={code} label="code" className="mt-3" />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
