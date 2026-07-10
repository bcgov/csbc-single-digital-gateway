import { describe, expect, it, vi } from 'vitest';

import { subscribeToNotifications } from '@/lib/notifications';

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly listeners = new Map<string, Set<() => void>>();
  closed = false;

  constructor(
    readonly url: string,
    readonly init?: { withCredentials?: boolean },
  ) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: () => void): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }

  close(): void {
    this.closed = true;
  }
}

describe('subscribeToNotifications', () => {
  it('opens a credentialed EventSource on the BFF stream and relays notification events', () => {
    FakeEventSource.instances = [];
    const onEvent = vi.fn();
    const sub = subscribeToNotifications(onEvent, FakeEventSource as unknown as typeof EventSource);
    const source = FakeEventSource.instances[0]!;
    expect(source.url).toContain('/v1/me/notifications/stream');
    expect(source.init?.withCredentials).toBe(true);
    source.emit('notification');
    source.emit('notification');
    expect(onEvent).toHaveBeenCalledTimes(2);
    sub.close();
    expect(source.closed).toBe(true);
  });

  it('no-ops when no EventSource implementation exists (jsdom)', () => {
    const sub = subscribeToNotifications(vi.fn(), undefined);
    expect(() => sub.close()).not.toThrow();
  });
});
