import { describe, expect, it } from 'vitest';
import {
  createServiceSchema,
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

  it('updateVersionDataSchema requires a data object; applications are optional', () => {
    expect(updateVersionDataSchema.safeParse({ data: { title: 'x' } }).success).toBe(true);
    expect(updateVersionDataSchema.safeParse({ data: 'nope' }).success).toBe(false);
    expect(updateVersionDataSchema.safeParse({}).success).toBe(false);
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
