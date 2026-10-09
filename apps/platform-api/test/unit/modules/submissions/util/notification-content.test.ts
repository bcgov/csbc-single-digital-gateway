import { describe, expect, it } from 'vitest';
import { reviewNotificationContent } from '../../../../../src/modules/submissions/util/notification-content';

describe('reviewNotificationContent', () => {
  it('Should map approved decisions', () => {
    const c = reviewNotificationContent('approved', 'APP-2026-0001');
    expect(c.type).toBe('application.approved');
    expect(c.title).toBe('Your application was approved');
    expect(c.body).toContain('APP-2026-0001');
  });

  it('Should map needs_changes decisions and include the reviewer note', () => {
    const c = reviewNotificationContent('needs_changes', 'APP-2026-0002', 'Please attach ID.');
    expect(c.type).toBe('application.needs_changes');
    expect(c.title).toBe('Your application needs changes');
    expect(c.body).toContain('APP-2026-0002');
    expect(c.body).toContain('Please attach ID.');
  });

  it('Should map rejected decisions without a note', () => {
    const c = reviewNotificationContent('rejected', 'APP-2026-0003');
    expect(c.type).toBe('application.rejected');
    expect(c.title).toBe('Your application was rejected');
    expect(c.body).not.toContain('Reviewer note');
  });
});
