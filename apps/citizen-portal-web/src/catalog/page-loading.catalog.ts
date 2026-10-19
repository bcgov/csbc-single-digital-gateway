import type { ComponentUsageMetadata } from '@repo/ui/catalog-types';

export default {
  component: 'page-loading',
  category: 'layout-template',
  status: 'experimental',
  intendedUsage:
    "The standard page-body skeleton while the session or page data resolves ('content' | 'settings' | 'detail'). Rendered inside PageContent, without a title band.",
} satisfies ComponentUsageMetadata;
