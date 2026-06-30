/**
 * Static marketing content for the citizen-portal-web landing (feature 59). The dynamic data —
 * services and applications — now comes from the citizen-portal-api catalog (`src/lib/catalog.ts`,
 * feature 60); only the evergreen "What you can do" cards live here.
 */
import { type LucideIcon, Search, SendHorizontal, UserRoundCog } from 'lucide-react';

/** One of the three "What you can do" cards. */
export interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const FEATURE_CARDS: readonly FeatureCard[] = [
  {
    id: 'discover',
    title: 'Discover services',
    description: 'Browse and search for government services.',
    icon: Search,
  },
  {
    id: 'apply',
    title: 'Apply and track your requests',
    description: 'Submit applications online and check the status of your requests.',
    icon: SendHorizontal,
  },
  {
    id: 'manage',
    title: 'Manage your information',
    description: 'View and update your information in one place.',
    icon: UserRoundCog,
  },
];
