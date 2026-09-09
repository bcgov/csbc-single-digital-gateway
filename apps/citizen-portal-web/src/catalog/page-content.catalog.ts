import type { ComponentUsageMetadata } from '@repo/ui/catalog-types';

export default {
  component: 'page-content',
  category: 'layout-template',
  status: 'stable',
  intendedUsage:
    'The standard citizen-portal-web page body: a centered, width-constrained, padded flex column. Every page under apps/citizen-portal-web should render its main content through this instead of hand-rolling the content-column Tailwind string. Not used by platform-web.',
} satisfies ComponentUsageMetadata;
