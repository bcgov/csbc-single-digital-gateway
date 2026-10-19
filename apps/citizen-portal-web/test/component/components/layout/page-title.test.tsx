import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageTitle } from '@/components/layout/page-title';

describe('PageTitle', () => {
  it("renders the page's h1", () => {
    render(<PageTitle>Account settings</PageTitle>);
    expect(screen.getByRole('heading', { name: 'Account settings', level: 1 })).toBeInTheDocument();
  });
});
