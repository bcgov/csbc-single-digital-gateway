import { vi } from 'vitest';

export const mockNavigate = vi.fn();

export const originalFetch = globalThis.fetch;

export const mockUseSearch = vi.fn(() => ({}));

export const handleOpenChange = vi.fn();

export const mockFetch = vi.fn();
