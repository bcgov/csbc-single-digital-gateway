import type { ComponentUsageMetadata } from '@repo/ui/catalog-types';

export default {
  component: 'message-card',
  category: 'layout-template',
  status: 'experimental',
  intendedUsage:
    "A centered card that replaces normal page content: not found, unavailable, a success confirmation, an empty list. Title is the page's h1 by default; headingLevel={2} under a titled banner.",
} satisfies ComponentUsageMetadata;
