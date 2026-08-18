import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderRoute } from '../../support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('citizen-portal-web router', () => {
  it('resolves the anonymous landing route at /', async () => {
    await renderRoute('/');
    expect(
      await screen.findByRole('heading', { name: 'Access government services online' }),
    ).toBeInTheDocument();
  });

  it('resolves the services catalog route at /services', async () => {
    await renderRoute('/services');
    expect(await screen.findByRole('heading', { name: 'Services', level: 1 })).toBeInTheDocument();
  });
});
