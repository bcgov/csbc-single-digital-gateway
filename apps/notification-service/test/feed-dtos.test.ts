import { describe, expect, it } from 'vitest';
import { feedQuerySchema } from '../src/modules/recipients/dtos/feed.dtos';

describe('feedQuerySchema', () => {
  it('defaults limit to 20 and offset to 0', () => {
    const parsed = feedQuerySchema.parse({});
    expect(parsed.limit).toBe(20);
    expect(parsed.offset).toBe(0);
  });

  it('coerces limit/offset from query strings', () => {
    const parsed = feedQuerySchema.parse({ limit: '50', offset: '10' });
    expect(parsed.limit).toBe(50);
    expect(parsed.offset).toBe(10);
  });

  it('caps limit at 100', () => {
    expect(feedQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });

  it('rejects a negative offset and a zero/negative limit', () => {
    expect(feedQuerySchema.safeParse({ offset: '-1' }).success).toBe(false);
    expect(feedQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
  });
});
