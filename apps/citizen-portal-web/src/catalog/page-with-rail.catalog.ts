import type { ComponentUsageMetadata } from '@repo/ui/catalog-types';

export default {
  component: 'page-with-rail',
  category: 'layout-template',
  status: 'experimental',
  intendedUsage:
    'A long, sectioned page body with the sticky "On this page" jump-nav beside a stack of PageSections. Used by service detail and service version.',
} satisfies ComponentUsageMetadata;
