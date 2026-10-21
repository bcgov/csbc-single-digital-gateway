import { vi } from 'vitest';

/**
 * Creates a mock for window.location.assign and assigns it to window.location.
 * This is useful for testing components that navigate to a new URL.
 * @returns {vi.Mock} The mock function for window.location.assign.
 */
export const createMockAssign = () => {
  const assign = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign },
  });
  return assign;
};
