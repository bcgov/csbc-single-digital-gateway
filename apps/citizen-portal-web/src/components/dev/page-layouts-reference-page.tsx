import { mdiFileDocumentOutline, mdiHelpCircleOutline } from '@mdi/js';
import { Button } from '@repo/ui/button';
import { getA11yMetadata } from '@/a11y/a11y-catalog';
import { A11yRulesSection } from '@/components/dev/a11y-rules-section';
import { Breadcrumb } from '@/components/breadcrumb';
import { CodeBlock } from '@/components/dev/code-block';
import { DevPageLayout } from '@/components/dev/dev-page-layout';
import type { DevNavItem } from '@/components/dev/dev-page-nav';
import { DevSection } from '@/components/dev/dev-section';
import { ExamplePreview } from '@/components/dev/example-preview';
import { extractExample } from '@/components/dev/extract-example';
import { PropTable } from '@/components/dev/prop-table';
import { FullBleedBand } from '@/components/layout/full-bleed-band';
import { LoginGate } from '@/components/layout/login-gate';
import { MessageCard } from '@/components/layout/message-card';
import { PageContent } from '@/components/layout/page-content';
import { PageHeaderBanner } from '@/components/layout/page-header-banner';
import { PageLoading } from '@/components/layout/page-loading';
import { PageSection } from '@/components/layout/page-section';
import { PageTitle } from '@/components/layout/page-title';
import { PageWithRail } from '@/components/layout/page-with-rail';
import selfSource from './page-layouts-reference-page.tsx?raw';

const navItems: DevNavItem[] = [
  { id: 'templates', text: 'Page templates', level: 2 },
  { id: 'template-standard', text: 'Standard content', level: 3 },
  { id: 'template-settings', text: 'Settings', level: 3 },
  { id: 'template-detail', text: 'Detail with rail', level: 3 },
  { id: 'template-landing', text: 'Landing', level: 3 },
  { id: 'template-states', text: 'Loading & message states', level: 3 },
  { id: 'shells', text: 'Shells', level: 2 },
  { id: 'page-header-banner', text: 'PageHeaderBanner', level: 2 },
  { id: 'page-content', text: 'PageContent', level: 2 },
  { id: 'page-section', text: 'PageSection', level: 2 },
  { id: 'page-with-rail', text: 'PageWithRail', level: 2 },
  { id: 'message-card', text: 'MessageCard', level: 2 },
  { id: 'login-gate', text: 'LoginGate', level: 2 },
  { id: 'page-loading', text: 'PageLoading', level: 2 },
  { id: 'full-bleed-band', text: 'FullBleedBand', level: 2 },
  { id: 'accessibility', text: 'Accessibility', level: 2 },
];

const STANDARD_TEMPLATE = `<CitizenShell activeNav="services">
  <PageHeaderBanner breadcrumb={<Breadcrumb trail={trail} />}>
    <PageTitle>Services</PageTitle>
    <p className="text-sm text-muted-foreground">Optional subtitle, search, or actions.</p>
  </PageHeaderBanner>
  <PageContent>
    <PageSection title="All services">{/* … */}</PageSection>
  </PageContent>
</CitizenShell>`;

const SETTINGS_TEMPLATE = `<CitizenShell>
  <SettingsPageHeader
    icon={mdiBellOutline}
    title="Notification settings"
    subtitle="Choose how you hear about updates."
    breadcrumb={<Breadcrumb trail={trail} />}
  />
  <PageContent>
    <PageSection title="Notification Channels" gap={6}>{/* … */}</PageSection>
  </PageContent>
</CitizenShell>`;

const DETAIL_TEMPLATE = `<CitizenShell activeNav="services">
  <PageHeaderBanner breadcrumb={<Breadcrumb trail={trail} />}>
    <PageTitle>{service.title}</PageTitle>
  </PageHeaderBanner>
  <PageContent>
    <PageWithRail items={SECTIONS}>
      <PageSection id="overview" title="Overview">{/* … */}</PageSection>
      <PageSection id="contact" title="Contact information">{/* … */}</PageSection>
    </PageWithRail>
  </PageContent>
</CitizenShell>`;

const LANDING_TEMPLATE = `<CitizenShell activeNav="home">
  <FullBleedBand className="border-b-2 border-bcgov-gold bg-linear-to-t from-blue-10 to-white">
    <section className="py-12">
      <h1>Access government services online</h1>
    </section>
  </FullBleedBand>
  <PageContent>
    <PageSection title="What you can do">{/* … */}</PageSection>
  </PageContent>
</CitizenShell>`;

const STATES_TEMPLATE = `if (authPending) {
  return (
    <CitizenShell>
      <PageContent>
        <PageLoading variant="settings" />
      </PageContent>
    </CitizenShell>
  );
}

if (!user) {
  return (
    <CitizenShell>
      <PageContent>
        <LoginGate message="You need to be signed in to view your account." />
      </PageContent>
    </CitizenShell>
  );
}`;

const SHELL_CODE = `import { CitizenShell } from '@/components/layout/citizen-shell';

<CitizenShell activeNav="services">{/* title band + PageContent */}</CitizenShell>`;

const RAIL_ITEMS = [
  { id: 'rail-overview', label: 'Overview', icon: mdiFileDocumentOutline },
  { id: 'rail-help', label: 'Help', icon: mdiHelpCircleOutline },
] as const;

function PreviewBlock({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted p-4 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

// #region page-header-banner
function PageHeaderBannerExample() {
  return (
    <PageHeaderBanner
      breadcrumb={<Breadcrumb trail={[{ label: 'Home', href: '/' }, { label: 'Example page' }]} />}
    >
      <PageTitle>Example page</PageTitle>
      <p className="text-sm text-muted-foreground">A subtitle, metadata, or actions go here.</p>
    </PageHeaderBanner>
  );
}
// #endregion page-header-banner

// #region page-content
function PageContentExample() {
  return (
    <PageContent>
      <PreviewBlock label="Section one" />
      <PreviewBlock label="Section two" />
    </PageContent>
  );
}
// #endregion page-content

// #region page-section
function PageSectionExample() {
  return (
    <PageSection title="Eligibility criteria" description="Who can apply for this service.">
      <PreviewBlock label="Section content" />
    </PageSection>
  );
}
// #endregion page-section

// #region page-with-rail
function PageWithRailExample() {
  return (
    <PageWithRail items={RAIL_ITEMS}>
      <PageSection id="rail-overview" title="Overview">
        <PreviewBlock label="Overview content" />
      </PageSection>
      <PageSection id="rail-help" title="Help">
        <PreviewBlock label="Help content" />
      </PageSection>
    </PageWithRail>
  );
}
// #endregion page-with-rail

// #region message-card
function MessageCardExample() {
  return (
    <MessageCard
      title="Service not available"
      headingLevel={2}
      actions={<Button variant="outline">Back to services</Button>}
    >
      This service doesn’t exist or isn’t published.
    </MessageCard>
  );
}
// #endregion message-card

// #region login-gate
function LoginGateExample() {
  return <LoginGate message="You need to be signed in to view your account." />;
}
// #endregion login-gate

// #region page-loading
function PageLoadingExample() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <PageLoading variant="content" />
      <PageLoading variant="settings" />
      <PageLoading variant="detail" />
    </div>
  );
}
// #endregion page-loading

// #region full-bleed-band
function FullBleedBandExample() {
  return (
    <FullBleedBand className="border-b-2 border-bcgov-gold bg-linear-to-t from-blue-10 to-white">
      <div className="py-6">
        <PreviewBlock label="Band content, held to the page column" />
      </div>
    </FullBleedBand>
  );
}
// #endregion full-bleed-band

function Template({
  id,
  title,
  children,
  code,
}: {
  id: string;
  title: string;
  children: string;
  code: string;
}) {
  return (
    <div id={id} className="flex scroll-mt-6 flex-col gap-2">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
      <CodeBlock code={code} label={`${title} template`} />
    </div>
  );
}

export function PageLayoutsReferencePage() {
  return (
    <DevPageLayout
      title="Page layouts"
      description="The sanctioned layout primitives every citizen-portal-web page composes from, and the page templates they add up to."
      navItems={navItems}
      // The live PageWithRail example renders its own "On this page" nav; landmark labels must be unique.
      navLabel="Contents"
      navClassName="sticky top-0 h-screen overflow-y-auto"
    >
      <DevSection
        id="templates"
        title="Page templates"
        description="Every citizen-portal-web page is one of these shapes. Pick the template first, then fill it — if a page needs a structure none of these covers, stop and ask rather than hand-rolling one."
      >
        <div className="flex flex-col gap-8">
          <Template id="template-standard" title="Standard content" code={STANDARD_TEMPLATE}>
            A title band over a stack of sections. Services list, application form and application
            detail.
          </Template>
          <Template id="template-settings" title="Settings" code={SETTINGS_TEMPLATE}>
            The Account settings surfaces: SettingsPageHeader (icon badge + title) over the body.
          </Template>
          <Template id="template-detail" title="Detail with rail" code={DETAIL_TEMPLATE}>
            A long, sectioned page with a sticky “On this page” jump-nav. Service detail and service
            version.
          </Template>
          <Template id="template-landing" title="Landing" code={LANDING_TEMPLATE}>
            A full-bleed hero band over the body. The signed-out home page; the signed-in home uses
            the standard template with a greeting banner.
          </Template>
          <Template id="template-states" title="Loading & message states" code={STATES_TEMPLATE}>
            While the session or the page’s data resolves, render PageLoading without a title band;
            when signed out, LoginGate; when the record can’t be shown, MessageCard (its title is
            then the page’s h1).
          </Template>
        </div>
      </DevSection>

      <DevSection
        id="shells"
        title="Shells"
        description="CitizenShell is the chrome for every page: skip link, site header (signed-in or anonymous), the page's one <main>, and the footer. PageShell is the session-agnostic layer underneath — use it directly only in tests or for a page that must control the header variant itself."
      >
        <div className="flex flex-col gap-6">
          <CodeBlock code={SHELL_CODE} label="CitizenShell usage" />
          <PropTable
            rows={[
              ['activeNav', "'home' | 'services'", '—', 'Highlights a primary nav item.'],
              ['children', 'ReactNode', '—', 'A title band (optional) followed by PageContent.'],
            ]}
          />
        </div>
      </DevSection>

      <DevSection
        id="page-header-banner"
        title="PageHeaderBanner"
        description="The title band: optional breadcrumb strip, then the header body over a bcgov-gold rule. A sibling above PageContent, never inside it. Put a PageTitle in it; landing-style pages (home, services) use a bare <h1> for the larger display size. SettingsPageHeader composes this with an icon badge."
      >
        <div className="flex flex-col gap-6">
          <ExamplePreview code={extractExample(selfSource, 'page-header-banner')}>
            <PageHeaderBannerExample />
          </ExamplePreview>
          <PropTable
            rows={[
              ['breadcrumb', 'ReactNode', '—', 'Rendered in a strip above the header body.'],
              [
                'children',
                'ReactNode',
                '—',
                'The header body — normally PageTitle + subtitle/actions.',
              ],
            ]}
          />
        </div>
      </DevSection>

      <DevSection
        id="page-content"
        title="PageContent"
        description="The page body column: centered, width-constrained (PAGE_COLUMN_CLASS), padded, with a vertical gap between children."
      >
        <div className="flex flex-col gap-6">
          <ExamplePreview code={extractExample(selfSource, 'page-content')}>
            <PageContentExample />
          </ExamplePreview>
          <PropTable
            rows={[
              ['children', 'ReactNode', '—', 'The page body.'],
              ['gap', '0 | 3 | 6 | 9', '9', 'Vertical gap between stacked children.'],
              ['className', 'string', '—', 'Additional classes appended to the column.'],
            ]}
          />
        </div>
      </DevSection>

      <DevSection
        id="page-section"
        title="PageSection"
        description="A titled <section> in the page body, headed by SectionHeading (the accent-tab h2). Give it an id when it's a PageWithRail target."
      >
        <div className="flex flex-col gap-6">
          <ExamplePreview code={extractExample(selfSource, 'page-section')}>
            <PageSectionExample />
          </ExamplePreview>
          <PropTable
            rows={[
              ['title', 'string', '—', 'The section’s h2.'],
              ['description', 'ReactNode', '—', 'Muted supporting line under the heading.'],
              ['id', 'string', '—', 'Anchor id; adds scroll-mt-6 for rail jumps.'],
              ['gap', '3 | 4 | 6', '3', 'Gap between the heading and each child.'],
              ['className', 'string', '—', 'Additional classes on the section.'],
            ]}
          />
        </div>
      </DevSection>

      <DevSection
        id="page-with-rail"
        title="PageWithRail"
        description="A sticky, collapsible “On this page” jump-nav beside a stack of PageSections. Each item's id must match a child section's id."
      >
        <div className="flex flex-col gap-6">
          <ExamplePreview code={extractExample(selfSource, 'page-with-rail')}>
            <PageWithRailExample />
          </ExamplePreview>
          <PropTable
            rows={[
              ['items', '{ id, label, icon }[]', '—', 'Rail entries, in page order.'],
              ['children', 'ReactNode', '—', 'The PageSections the rail jumps to.'],
            ]}
          />
        </div>
      </DevSection>

      <DevSection
        id="message-card"
        title="MessageCard"
        description="A centered card that replaces normal content: not found, unavailable, a success confirmation, an empty list."
      >
        <div className="flex flex-col gap-6">
          <ExamplePreview code={extractExample(selfSource, 'message-card')}>
            <MessageCardExample />
          </ExamplePreview>
          <PropTable
            rows={[
              ['title', 'string', '—', 'Heading text; omit for a copy-only message.'],
              ['headingLevel', '1 | 2', '1', '2 when a title band above already owns the h1.'],
              ['icon', 'ReactNode', '—', 'Decorative icon above the title.'],
              ['actions', 'ReactNode', '—', 'Buttons/links in a centered row.'],
              [
                'children',
                'ReactNode',
                '—',
                'The message copy — inline content, rendered in a <p>.',
              ],
            ]}
          />
        </div>
      </DevSection>

      <DevSection
        id="login-gate"
        title="LoginGate"
        description="The signed-out state of a login-gated page — a MessageCard with a Log in link that returns to the current URL."
      >
        <div className="flex flex-col gap-6">
          <ExamplePreview code={extractExample(selfSource, 'login-gate')}>
            <LoginGateExample />
          </ExamplePreview>
          <PropTable
            rows={[
              ['message', 'string', '—', 'Why sign-in is needed.'],
              ['label', 'string', "'Log in'", 'The link text.'],
            ]}
          />
        </div>
      </DevSection>

      <DevSection
        id="page-loading"
        title="PageLoading"
        description="The standard skeleton for a page body while data or the session resolves. One shape per template."
      >
        <div className="flex flex-col gap-6">
          <ExamplePreview code={extractExample(selfSource, 'page-loading')}>
            <PageLoadingExample />
          </ExamplePreview>
          <PropTable
            rows={[
              ['variant', "'content' | 'settings' | 'detail'", "'content'", 'Skeleton shape.'],
            ]}
          />
        </div>
      </DevSection>

      <DevSection
        id="full-bleed-band"
        title="FullBleedBand"
        description="A band whose background and border run edge to edge while its content stays in the page column — for landing-style sections such as the home hero."
      >
        <div className="flex flex-col gap-6">
          <ExamplePreview code={extractExample(selfSource, 'full-bleed-band')}>
            <FullBleedBandExample />
          </ExamplePreview>
          <PropTable
            rows={[
              ['className', 'string', '—', 'The band’s background/border classes.'],
              ['children', 'ReactNode', '—', 'Content, held to the page column.'],
            ]}
          />
        </div>
      </DevSection>

      <DevSection id="accessibility" title="Accessibility">
        <A11yRulesSection metadata={getA11yMetadata('page-layouts')} />
      </DevSection>
    </DevPageLayout>
  );
}
