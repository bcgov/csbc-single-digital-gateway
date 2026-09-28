import { describe, expect, it } from 'vitest';
import { documentTypeLabel } from '@/lib/templates';

// Doc 226 rule 5 — the console never shows a raw type value.
describe('documentTypeLabel (doc 226)', () => {
  it('labels each of the three types', () => {
    expect(documentTypeLabel('services.service')).toBe('Service');
    expect(documentTypeLabel('services.service-application-method')).toBe('Application method');
    expect(documentTypeLabel('services.service-agreement')).toBe('Service agreement');
  });

  it('falls back to the raw value for an unknown type', () => {
    expect(documentTypeLabel('services.something-new')).toBe('services.something-new');
    // Not fooled by Object.prototype keys.
    expect(documentTypeLabel('toString')).toBe('toString');
  });
});
