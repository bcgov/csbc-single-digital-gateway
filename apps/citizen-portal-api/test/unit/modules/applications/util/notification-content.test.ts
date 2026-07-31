import { describe, expect, it } from 'vitest';
import {
  staffSubmissionContent,
  submissionReceivedContent,
} from '../../../../../src/modules/applications/util/notification-content';

describe('submissionReceivedContent', () => {
  it('composes the received confirmation around the reference', () => {
    const c = submissionReceivedContent('20260710-AB12');
    expect(c.type).toBe('application.received');
    expect(c.title).toBe('We received your application');
    expect(c.body).toContain('20260710-AB12');
    expect(c.body).toContain('pending review');
  });
});

describe('staffSubmissionContent', () => {
  it('composes the staff alert around the service title and reference', () => {
    const c = staffSubmissionContent('20260710-AB12', 'Income Assistance');
    expect(c.type).toBe('submission.received');
    expect(c.title).toBe('New application received');
    expect(c.body).toContain('Income Assistance');
    expect(c.body).toContain('20260710-AB12');
  });

  it('copes with an unknown service title', () => {
    const c = staffSubmissionContent('20260710-AB12', null);
    expect(c.body).toContain('20260710-AB12');
    expect(c.body).not.toContain('null');
  });
});
