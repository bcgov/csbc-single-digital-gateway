import type { ComponentA11yMetadata } from '@repo/ui/a11y-types';
import { WCAG } from '@repo/ui/wcag-criteria';

export default {
  component: 'page-layouts',
  wcagCriteria: [
    WCAG.infoAndRelationships,
    WCAG.headingsAndLabels,
    WCAG.focusOrder,
    WCAG.location,
    WCAG.nameRoleValue,
  ],
  rules: [
    {
      id: 'single-main',
      description:
        'PageShell (via CitizenShell) renders the page’s only <main id="main-content">, preceded by a "Skip to main content" link. Page bodies never render their own <main>.',
      severity: 'required',
    },
    {
      id: 'one-h1',
      description:
        'Each page has exactly one <h1>: PageTitle in the title band, or — when the band has no title (loading, not found) — the MessageCard title. Pass headingLevel={2} to a MessageCard rendered under a titled band.',
      severity: 'required',
    },
    {
      id: 'section-headings',
      description:
        'Body sections use PageSection, whose SectionHeading is an <h2>; nested headings inside a section go one level deeper.',
      severity: 'required',
    },
    {
      id: 'rail-nav-labelled',
      description:
        'PageWithRail’s jump-nav is a <nav aria-label="On this page"> marking the in-view link with aria-current="location"; every item id matches a PageSection id so the link moves focus to a real target.',
      severity: 'required',
    },
    {
      id: 'breadcrumb-in-banner',
      description:
        'The breadcrumb goes in PageHeaderBanner’s breadcrumb slot, so it comes before the h1 in reading and focus order on every page.',
      severity: 'recommended',
    },
    {
      id: 'loading-busy',
      description:
        'PageLoading marks its skeleton aria-busy so assistive tech doesn’t announce placeholder shapes as content.',
      severity: 'recommended',
    },
  ],
  commonMisuses: [
    'Nesting PageHeaderBanner inside PageContent — the band then loses its column alignment and the rule no longer sits under the header.',
    'Hand-rolling a centered card or a max-w-285 column instead of MessageCard / PageContent (caught by test/page-imports.test.ts).',
    'Giving a MessageCard the default h1 under a banner that already renders a PageTitle — two h1s on one page.',
  ],
  notes: [
    'The examples on this reference page render PageTitle inside the /dev page, so this page itself has more than one h1; real pages must not.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
