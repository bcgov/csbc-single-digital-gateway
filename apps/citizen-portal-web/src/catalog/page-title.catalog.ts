import type { ComponentUsageMetadata } from '@repo/ui/catalog-types';

export default {
  component: 'page-title',
  category: 'layout-template',
  status: 'experimental',
  intendedUsage:
    "The page's single <h1> in the standard title style, rendered inside PageHeaderBanner. Use it instead of styling an h1 per page.",
} satisfies ComponentUsageMetadata;
