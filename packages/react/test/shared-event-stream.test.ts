import { describe, expect, it, vi } from 'vitest';
import { type SharedEventStreamDeps, subscribeSharedEventStream } from '../src/shared-event-stream';

/** An EventSource stand-in: records every instance; `emit` fires a named event. */
class FakeSource {
  static instances: FakeSource[] = [];
  closed = false;
  private readonly listeners = new Map<string, (() => void)[]>();
  constructor(
    readonly url: string,
    readonly init?: { withCredentials?: boolean },
  ) {
    FakeSource.instances.push(this);
  }
  addEventListener(name: string, listener: () => void) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }
  emit(name: string) {
    for (const listener of this.listeners.get(name) ?? []) listener();
  }
  close() {
    this.closed = true;
  }
}

/** A browser's Web Locks, shared by every "tab" in a test: one holder per name, waiters in order, abortable. */
function fakeLocks() {
  const queue: { run: () => Promise<void>; signal?: AbortSignal; reject: (e: unknown) => void }[] =
    [];
  let held = false;
  const next = () => {
    if (held) return;
    const entry = queue.shift();
    if (entry === undefined) return;
    held = true;
    void entry.run().finally(() => {
      held = false;
      next();
    });
  };
  return {
    request: (
      _name: string,
      options: { signal?: AbortSignal },
      callback: () => Promise<void>,
    ): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        const entry = {
          run: () => callback().then(resolve, reject),
          ...(options.signal !== undefined && { signal: options.signal }),
          reject,
        };
        options.signal?.addEventListener('abort', () => {
          const index = queue.indexOf(entry);
          if (index !== -1) {
            queue.splice(index, 1);
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          }
        });
        queue.push(entry);
        next();
      }),
  };
}

/** A BroadcastChannel stand-in: delivers to every OTHER open channel of the same name, asynchronously. */
function fakeChannels() {
  const open = new Set<FakeChannel>();
  class FakeChannel {
    private readonly listeners: ((m: { data: unknown }) => void)[] = [];
    constructor(readonly name: string) {
      open.add(this);
    }
    addEventListener(_type: 'message', listener: (m: { data: unknown }) => void) {
      this.listeners.push(listener);
    }
    postMessage(data: unknown) {
      for (const other of open)
        if (other !== this && other.name === this.name)
          queueMicrotask(() => other.listeners.forEach((l) => l({ data })));
    }
    close() {
      open.delete(this);
    }
  }
  return FakeChannel;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const OPTIONS = {
  url: 'https://bff/v1/me/notifications/stream',
  channel: 'notifications',
  event: 'notification',
  withCredentials: true,
};

/** One browser: every subscription made with these deps is another tab of it. */
function browser(): SharedEventStreamDeps {
  FakeSource.instances = [];
  return {
    EventSource: FakeSource as unknown as typeof EventSource,
    locks: fakeLocks() as unknown as Pick<LockManager, 'request'>,
    BroadcastChannel: fakeChannels() as unknown as typeof BroadcastChannel,
  };
}

// 126 B1 / 125 B1 / 123 B1.
describe('subscribeSharedEventStream', () => {
  describe('one stream per browser', () => {
    it('opens one EventSource in the tab that wins the lock and none in the others', async () => {
      const deps = browser();
      const tabs = [1, 2, 3].map(() =>
        subscribeSharedEventStream({ ...OPTIONS, onEvent: vi.fn() }, deps),
      );
      await settle();

      expect(FakeSource.instances).toHaveLength(1);
      expect(FakeSource.instances[0]?.url).toBe(OPTIONS.url);
      expect(FakeSource.instances[0]?.init).toEqual({ withCredentials: true });
      tabs.forEach((tab) => tab.close());
    });

    it('delivers each event to every subscribed tab, the leader included', async () => {
      const deps = browser();
      const handlers = [vi.fn(), vi.fn(), vi.fn()];
      const tabs = handlers.map((onEvent) =>
        subscribeSharedEventStream({ ...OPTIONS, onEvent }, deps),
      );
      await settle();

      FakeSource.instances[0]!.emit('notification');
      FakeSource.instances[0]!.emit('something-else');
      await settle();

      expect(handlers.map((h) => h.mock.calls.length)).toEqual([1, 1, 1]);
      tabs.forEach((tab) => tab.close());
    });

    it('hands the stream to a waiting tab when the leader closes', async () => {
      const deps = browser();
      const leader = subscribeSharedEventStream({ ...OPTIONS, onEvent: vi.fn() }, deps);
      const onEvent = vi.fn();
      const follower = subscribeSharedEventStream({ ...OPTIONS, onEvent }, deps);
      await settle();
      expect(FakeSource.instances).toHaveLength(1);

      leader.close();
      await settle();

      expect(FakeSource.instances[0]?.closed).toBe(true);
      expect(FakeSource.instances).toHaveLength(2);
      FakeSource.instances[1]!.emit('notification');
      expect(onEvent).toHaveBeenCalledTimes(1);
      follower.close();
      expect(FakeSource.instances[1]?.closed).toBe(true);
    });
  });

  describe('lifecycle', () => {
    it('close() before winning the lock never opens a stream', async () => {
      const deps = browser();
      const leader = subscribeSharedEventStream({ ...OPTIONS, onEvent: vi.fn() }, deps);
      const quitter = subscribeSharedEventStream({ ...OPTIONS, onEvent: vi.fn() }, deps);
      await settle();
      quitter.close();
      leader.close();
      await settle();

      // Only the leader's stream ever existed.
      expect(FakeSource.instances).toHaveLength(1);
    });

    it('falls back to one EventSource per tab without Web Locks or BroadcastChannel', async () => {
      FakeSource.instances = [];
      const deps = { EventSource: FakeSource as unknown as typeof EventSource };
      const onEvent = vi.fn();
      const a = subscribeSharedEventStream({ ...OPTIONS, onEvent }, deps);
      const b = subscribeSharedEventStream({ ...OPTIONS, onEvent: vi.fn() }, deps);
      await settle();

      expect(FakeSource.instances).toHaveLength(2);
      FakeSource.instances[0]!.emit('notification');
      expect(onEvent).toHaveBeenCalledTimes(1);
      a.close();
      b.close();
      expect(FakeSource.instances.every((s) => s.closed)).toBe(true);
      // No EventSource at all (jsdom): a no-op.
      expect(() => subscribeSharedEventStream({ ...OPTIONS, onEvent }, {}).close()).not.toThrow();
    });
  });
});
