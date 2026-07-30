import { describe, expect, it } from 'vitest';
import {
  createServiceSchema,
  listServicesPageQuerySchema,
  listServicesQuerySchema,
  updateVersionDataSchema,
} from '../src/modules/services/dtos/service.dtos';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('service DTO schemas', () => {
  it('createServiceSchema requires a uuid workspaceId and a non-empty title', () => {
    expect(createServiceSchema.safeParse({ workspaceId: UUID, title: 'Permit' }).success).toBe(
      true,
    );
    expect(createServiceSchema.safeParse({ title: 'Permit' }).success).toBe(false);
    expect(
      createServiceSchema.safeParse({ workspaceId: 'not-a-uuid', title: 'Permit' }).success,
    ).toBe(false);
    expect(createServiceSchema.safeParse({ workspaceId: UUID, title: '' }).success).toBe(false);
  });

  it('listServicesQuerySchema requires a uuid workspaceId', () => {
    expect(listServicesQuerySchema.safeParse({ workspaceId: UUID }).success).toBe(true);
    expect(listServicesQuerySchema.safeParse({}).success).toBe(false);
  });

  it('listServicesPageQuerySchema defaults paging/sort and coerces limit/offset', () => {
    const parsed = listServicesPageQuerySchema.safeParse({ workspaceId: UUID });
    expect(parsed.success && parsed.data).toMatchObject({
      sort: 'updated',
      order: 'desc',
      limit: 20,
      offset: 0,
    });
    // Coerces numeric strings from the query string.
    const coerced = listServicesPageQuerySchema.safeParse({
      workspaceId: UUID,
      limit: '50',
      offset: '20',
    });
    expect(coerced.success && coerced.data.limit).toBe(50);
    expect(coerced.success && coerced.data.offset).toBe(20);
  });

  it('listServicesPageQuerySchema bounds limit and rejects unknown sort/order', () => {
    expect(listServicesPageQuerySchema.safeParse({ workspaceId: UUID, limit: 0 }).success).toBe(
      false,
    );
    expect(listServicesPageQuerySchema.safeParse({ workspaceId: UUID, limit: 101 }).success).toBe(
      false,
    );
    expect(listServicesPageQuerySchema.safeParse({ workspaceId: UUID, offset: -1 }).success).toBe(
      false,
    );
    expect(
      listServicesPageQuerySchema.safeParse({ workspaceId: UUID, sort: 'bogus' }).success,
    ).toBe(false);
    expect(
      listServicesPageQuerySchema.safeParse({ workspaceId: UUID, order: 'sideways' }).success,
    ).toBe(false);
    // Trimmed search, length-capped.
    expect(
      listServicesPageQuerySchema.safeParse({ workspaceId: UUID, q: 'a'.repeat(256) }).success,
    ).toBe(false);
  });

  it('updateVersionDataSchema requires a data object; applications are optional', () => {
    expect(updateVersionDataSchema.safeParse({ data: { title: 'x' } }).success).toBe(true);
    expect(updateVersionDataSchema.safeParse({ data: 'nope' }).success).toBe(false);
    expect(updateVersionDataSchema.safeParse({}).success).toBe(false);
  });

  it('updateVersionDataSchema accepts an optional applicationOrder of uuids (feature 132)', () => {
    expect(
      updateVersionDataSchema.safeParse({ data: {}, applicationOrder: [UUID, UUID] }).success,
    ).toBe(true);
    // Empty order is valid (a service can have its methods cleared to none).
    expect(updateVersionDataSchema.safeParse({ data: {}, applicationOrder: [] }).success).toBe(
      true,
    );
    // Non-uuid ids are rejected.
    expect(
      updateVersionDataSchema.safeParse({ data: {}, applicationOrder: ['nope'] }).success,
    ).toBe(false);
  });

  it('createServiceSchema accepts applications (existing + new form) and defaults them empty', () => {
    const parsed = createServiceSchema.safeParse({ workspaceId: UUID, title: 'Permit' });
    expect(parsed.success && parsed.data.applications).toEqual([]);
    expect(
      createServiceSchema.safeParse({
        workspaceId: UUID,
        title: 'Permit',
        data: { description: 'd' },
        applications: [
          { label: 'Apply', form: { mode: 'existing', versionId: UUID } },
          { label: 'New', form: { mode: 'new', typeId: UUID, title: 'A form' } },
        ],
      }).success,
    ).toBe(true);
    // A new-form application without a title is rejected by the discriminated union.
    expect(
      createServiceSchema.safeParse({
        workspaceId: UUID,
        title: 'Permit',
        applications: [{ label: 'X', form: { mode: 'new', typeId: UUID } }],
      }).success,
    ).toBe(false);
  });
});
