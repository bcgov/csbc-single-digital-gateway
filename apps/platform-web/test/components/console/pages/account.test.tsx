import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountPage } from '@/components/console/pages/account';
import { useAuth } from '@/lib/auth';

// Mock useAuth from auth library
vi.mock('@/lib/auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...original,
    useAuth: vi.fn(),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const mockUser = {
  id: 'u-123',
  roles: ['staff'],
  claims: {
    sub: 'sub-123',
    name: 'Maya Reyes',
    email: 'maya.reyes@riverton.gov',
  },
};

describe('AccountPage', () => {
  it('renders a loading skeleton when user data is loading', () => {
    vi.mocked(useAuth).mockReturnValue({ data: undefined } as any);

    const { container } = render(<AccountPage />);

    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
  });

  it('renders user details when user data is loaded', () => {
    vi.mocked(useAuth).mockReturnValue({ data: mockUser } as any);

    render(<AccountPage />);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Your personal account details.')).toBeInTheDocument();

    expect(screen.getByText('Maya Reyes')).toBeInTheDocument();
    expect(screen.getByText('maya.reyes@riverton.gov · Staff')).toBeInTheDocument();

    const nameInput = screen.getByLabelText('Full name');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveValue('Maya Reyes');

    const emailInput = screen.getByLabelText('Email');
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveValue('maya.reyes@riverton.gov');

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });
});
