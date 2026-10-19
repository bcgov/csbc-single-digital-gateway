import type { ComponentUsageMetadata } from '@repo/ui/catalog-types';

export default {
  component: 'login-gate',
  category: 'layout-template',
  status: 'experimental',
  intendedUsage:
    'The signed-out state of a login-gated page: a MessageCard with a Log in link back to the current URL.',
} satisfies ComponentUsageMetadata;
