// Converting an item's width when it moves between layouts with different column counts (doc 183 rule 12c). Pure, so
// the free Grid engine's preview and the tests share one rule.

const isPositive = (value: number) => Number.isFinite(value) && value > 0;

/**
 * The width, in `toColumns`, that fills the same share of a row as `w` of `fromColumns`: rounded to the nearest whole
 * column and clamped to `1..toColumns`. A `fromColumns` that is not a positive number keeps `w`, clamped.
 */
export function movedWidth(w: number, fromColumns: number, toColumns: number): number {
  const converted = isPositive(fromColumns) ? Math.round((w / fromColumns) * toColumns) : w;
  return Number.isFinite(converted) ? Math.max(1, Math.min(toColumns, converted)) : 1;
}
