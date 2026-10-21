/**
 * One Server-Sent Events stream per BROWSER, not per tab (126 B1 / 125 B1).
 *
 * A browser allows six HTTP/1.1 connections per host, shared by every tab. A stream per tab held one each, so from the
 * sixth tab on every request to that host queued forever. Here the tabs elect ONE leader with the Web Locks API; only
 * the leader opens an `EventSource`, and it relays each event to the other tabs over a `BroadcastChannel` (which never
 * delivers to its sender, so the leader also handles its own). When the leader's tab closes, its lock is released and a
 * waiting tab takes over. Without Web Locks or `BroadcastChannel` it falls back to a stream per tab.
 *
 * Events are relayed by NAME only — subscribers treat an event as "refetch", so no payload crosses tabs.
 */

export interface SharedEventStreamOptions {
  /** The SSE endpoint. */
  readonly url: string;
  /** Names the lock and the channel; tabs sharing it share one stream. */
  readonly channel: string;
  /** The SSE event to listen for. */
  readonly event: string;
  readonly onEvent: () => void;
  readonly withCredentials?: boolean;
}

/** What the browser provides — injectable for tests. */
export interface SharedEventStreamDeps {
  readonly EventSource?: typeof EventSource | undefined;
  readonly locks?: Pick<LockManager, 'request'> | undefined;
  readonly BroadcastChannel?: typeof BroadcastChannel | undefined;
}

export interface SharedEventStream {
  close(): void;
}

function browserDeps(): SharedEventStreamDeps {
  return {
    EventSource: typeof EventSource === 'undefined' ? undefined : EventSource,
    locks: typeof navigator === 'undefined' ? undefined : navigator.locks,
    BroadcastChannel: typeof BroadcastChannel === 'undefined' ? undefined : BroadcastChannel,
  };
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** Subscribe `onEvent` to `event` on `url`, sharing one stream between every tab on `channel`. */
export function subscribeSharedEventStream(
  options: SharedEventStreamOptions,
  deps: SharedEventStreamDeps = browserDeps(),
): SharedEventStream {
  const { url, channel, event, onEvent, withCredentials = false } = options;
  const Source = deps.EventSource;
  if (Source === undefined) return { close: () => {} };

  /** A stream opened by this tab: `onEvent` on each event, then `relay` (the leader's) when given. */
  const open = (relay?: () => void): EventSource => {
    const source = new Source(url, { withCredentials });
    source.addEventListener(
      event,
      relay === undefined
        ? onEvent
        : () => {
            onEvent();
            relay();
          },
    );
    return source;
  };

  const { locks, BroadcastChannel: Channel } = deps;
  if (locks === undefined || Channel === undefined) {
    const source = open();
    return { close: () => source.close() };
  }

  const bus = new Channel(channel);
  bus.addEventListener('message', (message: MessageEvent) => {
    if (message.data === event) onEvent();
  });
  const waiting = new AbortController();
  let closed = false;
  let release: (() => void) | undefined;
  let fallback: EventSource | undefined;

  locks
    .request(
      `${channel}:leader`,
      { signal: waiting.signal },
      () =>
        // Held until this tab closes its subscription (or the tab goes away and the browser releases it).
        new Promise<void>((resolve) => {
          if (closed) {
            resolve();
            return;
          }
          // eslint-disable-next-line unicorn/require-post-message-target-origin -- BroadcastChannel has no target origin: it never leaves this origin.
          const source = open(() => bus.postMessage(event));
          release = () => {
            source.close();
            resolve();
          };
        }),
    )
    .catch((error: unknown) => {
      if (isAbort(error)) return; // closed while still waiting for the lock
      console.error(
        'shared event stream: leader election failed, using a stream for this tab',
        error,
      );
      if (!closed) fallback = open();
    });

  return {
    close: () => {
      closed = true;
      waiting.abort();
      release?.();
      fallback?.close();
      bus.close();
    },
  };
}
