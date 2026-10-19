import type { ComponentUsageMetadata } from '@repo/ui/catalog-types';

export default {
  component: 'page-content',
  category: 'layout-template',
  status: 'stable',
  intendedUsage:
    'The standard citizen-portal-web page body: a centered, width-constrained, padded flex column. Every page renders its main content through this instead of hand-rolling the column (PAGE_COLUMN_CLASS); title bands sit above it as siblings. Not used by platform-web.',
} satisfies ComponentUsageMetadata;
