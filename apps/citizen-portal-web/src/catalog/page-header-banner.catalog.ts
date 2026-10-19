import type { ComponentUsageMetadata } from '@repo/ui/catalog-types';

export default {
  component: 'page-header-banner',
  category: 'layout-template',
  status: 'stable',
  intendedUsage:
    'The title band: optional breadcrumb strip plus the header body over a bcgov-gold rule. A sibling above PageContent, holding a PageTitle (or a bare <h1> on landing-style pages).',
} satisfies ComponentUsageMetadata;
