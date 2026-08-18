import { Button } from '@repo/ui/button';
import type { ApplicationStatus } from '@/lib/catalog';
import { getA11yMetadata } from '@/a11y/a11y-catalog';
import { A11yRulesSection } from '@/components/dev/a11y-rules-section';
import { CodeBlock } from '@/components/dev/code-block';
import { DevPageLayout } from '@/components/dev/dev-page-layout';
import type { DevNavItem } from '@/components/dev/dev-page-nav';
import { DevSection } from '@/components/dev/dev-section';
import { ExamplePreview } from '@/components/dev/example-preview';
import { extractExample } from '@/components/dev/extract-example';
import { PropTable } from '@/components/dev/prop-table';
import { StatusBanner } from '@/components/application/status-banner';
import selfSource from './status-banner-reference-page.tsx?raw';

const navItems: DevNavItem[] = [
  { id: 'full-example', text: 'Full example', level: 2 },
  { id: 'usage', text: 'Usage', level: 2 },
  { id: 'composition', text: 'Composition', level: 2 },
  { id: 'statuses', text: 'Statuses', level: 2 },
  { id: 'review-reason', text: 'Review reason', level: 2 },
  { id: 'action', text: 'Action', level: 2 },
  { id: 'accessibility', text: 'Accessibility', level: 2 },
  { id: 'api-reference', text: 'API reference', level: 2 },
];

const STATUSES: ApplicationStatus[] = [
  'draft',
  'pending',
  'in_review',
  'approved',
  'rejected',
  'needs_changes',
  'withdrawn',
];

const USAGE_IMPORT_CODE = `import { StatusBanner } from "@/components/application/status-banner";`;

const USAGE_SKELETON_CODE = `<StatusBanner status={application.status} />`;

/** Already DRY without extraction — both the rendered stack and the shown code derive from this
 *  one array, so there's no separately-maintained duplicate to fall out of sync. */
const STATUSES_CODE = STATUSES.map((status) => `<StatusBanner status="${status}" />`).join('\n');

// #region full-example
function FullExampleBanner() {
  return (
    <StatusBanner status="needs_changes" reviewReason="Please attach a recent proof of address." />
  );
}
// #endregion full-example

function ReviewReasonExample() {
  return (
    <div className="flex flex-col gap-4">
      {/* #region review-reason */}
      <StatusBanner
        status="needs_changes"
        reviewReason="Please attach a recent proof of address."
      />
      <StatusBanner status="rejected" reviewReason="This service isn't available in your region." />
      {/* #endregion review-reason */}
    </div>
  );
}

/** ACTION_CODE is deliberately NOT derived from the rendered example below — it illustrates a
 *  realistic caller (wiring the action to a real mutation), which would throw if actually
 *  rendered here (no `revise` mutation exists on this static reference page). The live demo
 *  simplifies to a plain, non-functional button instead. This divergence is intentional, not
 *  duplication that can drift — there's nothing to keep in sync since they're not meant to match. */
const ACTION_CODE = `<StatusBanner
  status="needs_changes"
  reviewReason="Please attach a recent proof of address."
  action={
    <Button variant="outline" onClick={() => revise.mutate()}>
      Make changes
    </Button>
  }
/>`;

export function StatusBannerReferencePage() {
  return (
    <DevPageLayout
      title="Status banner"
      description="The status-aware banner on the application detail page. Maps a submission status to a tone, headline, and explanatory copy, surfaces the reviewer's note for rejected / action-needed, and renders an optional action."
      navItems={navItems}
      navLabel="On this page"
      navClassName="sticky top-0 h-screen overflow-y-auto"
    >
      <DevSection id="full-example" title="Full example">
        <ExamplePreview code={extractExample(selfSource, 'full-example')}>
          <FullExampleBanner />
        </ExamplePreview>
      </DevSection>

      <DevSection id="usage" title="Usage">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Import</p>
            <CodeBlock code={USAGE_IMPORT_CODE} label="import statement" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Skeleton</p>
            <CodeBlock code={USAGE_SKELETON_CODE} label="skeleton" />
          </div>
        </div>
      </DevSection>

      <DevSection id="composition" title="Composition">
        <p className="text-sm text-muted-foreground">
          StatusBanner has no subcomponents — it derives everything (title, description, tone, icon)
          from the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">status</code> prop via
          an internal lookup table. The reviewer's note and the action slot are the only parts a
          caller controls directly.
        </p>
      </DevSection>

      <DevSection
        id="statuses"
        title="Statuses"
        description="Each ApplicationStatus maps to its own tone, headline, copy, and icon."
      >
        <ExamplePreview code={STATUSES_CODE}>
          <div className="flex flex-col gap-4">
            {STATUSES.map((status) => (
              <StatusBanner key={status} status={status} />
            ))}
          </div>
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="review-reason"
        title="Review reason"
        description="reviewReason only renders for the statuses a reviewer produces — needs_changes and rejected — and only when a reason is present."
      >
        <ExamplePreview code={extractExample(selfSource, 'review-reason')}>
          <ReviewReasonExample />
        </ExamplePreview>
      </DevSection>

      <DevSection
        id="action"
        title="Action"
        description="An optional action slot, e.g. a Button for 'Make changes' or 'Continue your application'."
      >
        <ExamplePreview code={ACTION_CODE}>
          <StatusBanner
            status="needs_changes"
            reviewReason="Please attach a recent proof of address."
            action={<Button variant="outline">Make changes</Button>}
          />
        </ExamplePreview>
      </DevSection>

      <DevSection id="accessibility" title="Accessibility">
        <A11yRulesSection metadata={getA11yMetadata('status-banner')} />
      </DevSection>

      <DevSection id="api-reference" title="API reference">
        <div className="space-y-2">
          <p className="text-sm font-medium">StatusBanner</p>
          <PropTable
            rows={[
              ['status', 'ApplicationStatus', '—', 'Required. Drives tone, title, copy, and icon.'],
              [
                'reviewReason',
                'string | null',
                '—',
                "Shown as a quoted note, only for 'needs_changes' and 'rejected'.",
              ],
              ['action', 'ReactNode', '—', 'Optional control rendered below the description.'],
            ]}
          />
        </div>
      </DevSection>
    </DevPageLayout>
  );
}
