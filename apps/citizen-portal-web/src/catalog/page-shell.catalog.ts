import type { ComponentUsageMetadata } from '@repo/ui/catalog-types';

export default {
  component: 'page-shell',
  category: 'layout-template',
  status: 'stable',
  intendedUsage:
    "The session-agnostic chrome under CitizenShell (skip link, SiteHeader, the one <main>, SiteFooter). Don't use it directly on a page — use CitizenShell.",
} satisfies ComponentUsageMetadata;
