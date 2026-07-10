import { describe, expect, it } from 'vitest';
import { submissionReceivedContent } from '../src/modules/applications/util/notification-content';

describe('submissionReceivedContent', () => {
  it('composes the received confirmation around the reference', () => {
    const c = submissionReceivedContent('20260710-AB12');
    expect(c.type).toBe('application.received');
    expect(c.title).toBe('We received your application');
    expect(c.body).toContain('20260710-AB12');
    expect(c.body).toContain('pending review');
  });
});
