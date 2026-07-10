import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import * as schema from '../src/schema';

// getTableConfig wants the base `PgTable<TableConfig>`; concrete drizzle tables carry
// literal-typed configs that trip invariance under `exactOptionalPropertyTypes`. Widen to
// the base type at the call boundary — the returned config shape is identical.
const cfg = (table: unknown) => getTableConfig(table as PgTable);

const EXPECTED_TABLES = [
  'recipients',
  'channel_preferences',
  'notifications',
  'deliveries',
] as const;

describe('schema — tables', () => {
  it('exports a drizzle pg table for every notification table', () => {
    const tableNames = (Object.values(schema) as unknown[])
      .filter((v) => is(v, PgTable))
      .map((t) => cfg(t).name);

    for (const expected of EXPECTED_TABLES) {
      expect(tableNames).toContain(expected);
    }
  });
});

describe('schema — enums', () => {
  it('notification_channel covers the launch channels', () => {
    expect(schema.notificationChannel.enumValues).toEqual(['in_app', 'email']);
  });

  it('delivery_status is the worker state machine', () => {
    expect(schema.deliveryStatus.enumValues).toEqual(['pending', 'sent', 'failed']);
  });
});

describe('schema — recipients (opaque profile anchor)', () => {
  it('has a unique NOT NULL uuid user_id and a nullable citext email', () => {
    const { columns, uniqueConstraints } = cfg(schema.recipients);
    const byName = new Map(columns.map((c) => [c.name, c]));

    const userId = byName.get('user_id');
    expect(userId, 'recipients.user_id must exist').toBeDefined();
    expect(userId?.getSQLType()).toBe('uuid');
    expect(userId?.notNull).toBe(true);
    expect(
      uniqueConstraints.some((u) => u.columns.some((c) => c.name === 'user_id')),
      'recipients.user_id must be UNIQUE',
    ).toBe(true);

    const email = byName.get('email');
    expect(email, 'recipients.email must exist').toBeDefined();
    expect(email?.getSQLType()).toBe('citext');
    expect(email?.notNull).toBe(false);
  });

  it('is mutable (updated_at present)', () => {
    const { columns } = cfg(schema.recipients);
    expect(columns.some((c) => c.name === 'updated_at')).toBe(true);
  });
});

describe('schema — channel_preferences (opt-in toggles)', () => {
  it('is unique per recipient × channel with an enabled flag defaulting off', () => {
    const { columns, uniqueConstraints } = cfg(schema.channelPreferences);
    const byName = new Map(columns.map((c) => [c.name, c]));

    expect(byName.get('channel')?.getSQLType()).toBe('notification_channel');

    const enabled = byName.get('enabled');
    expect(enabled?.notNull).toBe(true);
    expect(enabled?.hasDefault).toBe(true);

    expect(
      uniqueConstraints.some((u) => {
        const names = u.columns.map((c) => c.name).toSorted();
        return names.length === 2 && names[0] === 'channel' && names[1] === 'recipient_id';
      }),
      'UNIQUE(recipient_id, channel) must exist',
    ).toBe(true);
  });
});

describe('schema — notifications (ingestion inbox, immutable)', () => {
  it('has a unique NOT NULL idempotency_key', () => {
    const { columns, uniqueConstraints } = cfg(schema.notifications);
    const byName = new Map(columns.map((c) => [c.name, c]));

    const key = byName.get('idempotency_key');
    expect(key, 'notifications.idempotency_key must exist').toBeDefined();
    expect(key?.notNull).toBe(true);
    expect(
      uniqueConstraints.some((u) => u.columns.some((c) => c.name === 'idempotency_key')),
      'notifications.idempotency_key must be UNIQUE',
    ).toBe(true);
  });

  it('is append-only: no updated_at column', () => {
    const { columns } = cfg(schema.notifications);
    expect(columns.some((c) => c.name === 'updated_at')).toBe(false);
    expect(columns.some((c) => c.name === 'created_at')).toBe(true);
  });

  it('pins (id, recipient_id) with a UNIQUE constraint backing the deliveries composite FK', () => {
    const { uniqueConstraints } = cfg(schema.notifications);
    expect(
      uniqueConstraints.some((u) => {
        const names = u.columns.map((c) => c.name).toSorted();
        return names.length === 2 && names[0] === 'id' && names[1] === 'recipient_id';
      }),
      'UNIQUE(id, recipient_id) must exist',
    ).toBe(true);
  });
});

describe('schema — deliveries (per-channel outbox)', () => {
  it('has a writable pending-default status, attempts counter, and read_at for in-app', () => {
    const { columns } = cfg(schema.deliveries);
    const byName = new Map(columns.map((c) => [c.name, c]));

    const status = byName.get('status');
    expect(status?.getSQLType()).toBe('delivery_status');
    expect(status?.notNull).toBe(true);
    expect(status?.hasDefault).toBe(true);
    expect(status?.generated, 'status must be writable, not GENERATED').toBeUndefined();

    const attempts = byName.get('attempts');
    expect(attempts?.notNull).toBe(true);
    expect(attempts?.hasDefault).toBe(true);

    expect(byName.get('read_at')?.notNull).toBe(false);
    expect(byName.get('sent_at')?.notNull).toBe(false);
    expect(byName.get('last_error')?.notNull).toBe(false);
    expect(byName.has('updated_at')).toBe(true);
  });

  it('is unique per notification × channel', () => {
    const { uniqueConstraints } = cfg(schema.deliveries);
    expect(
      uniqueConstraints.some((u) => {
        const names = u.columns.map((c) => c.name).toSorted();
        return names.length === 2 && names[0] === 'channel' && names[1] === 'notification_id';
      }),
      'UNIQUE(notification_id, channel) must exist',
    ).toBe(true);
  });

  it('composite-FKs (notification_id, recipient_id) onto notifications(id, recipient_id)', () => {
    const { foreignKeys } = cfg(schema.deliveries);
    const composite = foreignKeys.find((fk) => fk.reference().columns.length === 2);
    expect(composite, 'composite FK must exist').toBeDefined();
    const ref = composite?.reference();
    expect(ref?.columns.map((c) => c.name).toSorted()).toEqual(['notification_id', 'recipient_id']);
    expect(ref?.foreignColumns.map((c) => c.name).toSorted()).toEqual(['id', 'recipient_id']);
  });
});
