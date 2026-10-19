import type { ComponentUsageMetadata } from '@repo/ui/catalog-types';

export default {
  component: 'page-section',
  category: 'layout-template',
  status: 'experimental',
  intendedUsage:
    "A titled <section> in the page body (accent-tab h2 via SectionHeading). Give it an id when it's a PageWithRail target.",
} satisfies ComponentUsageMetadata;
