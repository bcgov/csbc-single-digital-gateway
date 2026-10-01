import type { HeadingLevel } from '@repo/ui/heading';

/** What a Heading element's `options` may author (doc 236 rule 5), sanitised: wrong-typed values are ABSENT keys. */
export interface HeadingOptions {
  text?: string;
  level?: HeadingLevel;
  size?: HeadingLevel;
}

/** The level a Heading renders at when none is authored. */
export const DEFAULT_HEADING_LEVEL: HeadingLevel = 2;

export function headingOptions(options: unknown): HeadingOptions {
  const record = isRecord(options) ? options : {};
  const { text, level, size } = record;
  return {
    ...(typeof text === 'string' && { text }),
    ...(isHeadingLevel(level) && { level }),
    ...(isHeadingLevel(size) && { size }),
  };
}

function isHeadingLevel(value: unknown): value is HeadingLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 6;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
