/**
 * Mock content for the citizen-portal-web landing skeletons (feature 59). There is no
 * applications/services backend yet, so the marketing copy, available services, and tracked
 * applications are hard-coded here. Flip `MOCK_APPLICATIONS` to `[]` to see the empty `/app` state.
 */
import { type LucideIcon, Search, SendHorizontal, UserRoundCog } from 'lucide-react';

/** One of the three "What you can do" cards. */
export interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

/** A service surfaced in the "Available services" panel. */
export interface ServiceSummary {
  id: string;
  title: string;
  description: string;
}

/** An application the signed-in citizen has in flight. */
export interface Application {
  id: string;
  /** The service this application belongs to (matches a `ServiceSummary.id`). */
  service: string;
  serviceTitle: string;
  /** Human-facing reference / confirmation number. */
  reference: string;
  /** Display status label, e.g. "Review", "Submitted", "Approved". */
  status: string;
  /** Pre-formatted "last updated" date string (skeleton — not a real timestamp). */
  lastUpdated: string;
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

export const AVAILABLE_SERVICES: readonly ServiceSummary[] = [
  {
    id: 'income-disability-assistance',
    title: 'Income and Disability Assistance',
    description: 'Financial support and benefits for people with low income or disabilities.',
  },
  {
    id: 'birth-registration',
    title: 'Birth Registration',
    description: 'Register the birth of a child in B.C.',
  },
];

/**
 * Seed applications for the populated `/app` state. Replace with a real
 * citizen-portal-api query when one exists; set to `[]` to preview the empty state.
 */
export const MOCK_APPLICATIONS: readonly Application[] = [
  {
    id: 'app-birth-registration',
    service: 'birth-registration',
    serviceTitle: 'Birth Registration',
    reference: '20250615-0003',
    status: 'Review',
    lastUpdated: 'June 30, 2025',
  },
];
