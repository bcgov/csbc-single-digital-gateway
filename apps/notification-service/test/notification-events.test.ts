import { describe, expect, it, vi } from 'vitest';
import { NotificationEventsService } from '../src/modules/recipients/services/notification-events.service';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';

function makeService(): NotificationEventsService {
  // The pg LISTEN connection is inert under test (and never dialed here) — these tests drive
  // the in-process fan-out via the raw payload handler, exactly what the LISTEN callback does.
  return new NotificationEventsService({ $client: {} } as never, { get: () => 'test' } as never);
}

describe('NotificationEventsService fan-out', () => {
  it('delivers an event only to the matching recipient subscribers', () => {
    const service = makeService();
    const a = vi.fn();
    const b = vi.fn();
    service.subscribe(USER_A, a);
    service.subscribe(USER_B, b);
    service.handleNotificationPayload(JSON.stringify({ userId: USER_A }));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
  });

  it('supports multiple subscribers per recipient and unsubscribe', () => {
    const service = makeService();
    const first = vi.fn();
    const second = vi.fn();
    const offFirst = service.subscribe(USER_A, first);
    service.subscribe(USER_A, second);
    service.handleNotificationPayload(JSON.stringify({ userId: USER_A }));
    offFirst();
    service.handleNotificationPayload(JSON.stringify({ userId: USER_A }));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('ignores malformed payloads without throwing', () => {
    const service = makeService();
    const cb = vi.fn();
    service.subscribe(USER_A, cb);
    expect(() => service.handleNotificationPayload('not-json')).not.toThrow();
    expect(() => service.handleNotificationPayload(JSON.stringify({ nope: 1 }))).not.toThrow();
    expect(cb).not.toHaveBeenCalled();
  });
});
