import type { ComponentUsageMetadata } from '@repo/ui/catalog-types';

export default {
  component: 'citizen-shell',
  category: 'layout-template',
  status: 'stable',
  intendedUsage:
    "Page chrome for every citizen-portal-web page: wraps PageShell and picks the signed-in or anonymous header from the session. Every page's root element.",
} satisfies ComponentUsageMetadata;
