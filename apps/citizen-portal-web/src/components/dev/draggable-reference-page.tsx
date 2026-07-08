import { useRef } from 'react';
import { mdiCursorMove } from '@mdi/js';
import { DevPageLayout } from '@/components/dev/dev-page-layout';
import { useDevPageNav } from '@/components/dev/dev-page-nav';
import { DevSection } from '@/components/dev/dev-section';

const SECTION_ICONS: Record<string, string> = {
  'draggable-placeholder': mdiCursorMove,
};

export function DraggableReferencePage() {
  const contentRef = useRef<HTMLDivElement>(null);
  const navItems = useDevPageNav(contentRef, SECTION_ICONS);

  return (
    <DevPageLayout
      title="Draggable Components Reference"
      description="Rendered examples and copyable patterns for draggable UI components."
      navItems={navItems}
      contentRef={contentRef}
    >
      <DevSection
        id="draggable-placeholder"
        title="Draggable: Placeholder"
        description="This section is a placeholder. Add draggable component examples here."
      >
        <div className="rounded-md border border-dashed border-border bg-background p-8 text-center text-muted-foreground">
          Content coming soon
        </div>
      </DevSection>
    </DevPageLayout>
  );
}
