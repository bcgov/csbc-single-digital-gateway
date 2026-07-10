import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/** Validate a path uuid → 400 (a garbage value must not become a Postgres 22P02 → 500). */
export function parseUuidParam(value: string, name: string): string {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) {
    throw new BadRequestException(`${name} must be a uuid`);
  }
  return parsed.data;
}
