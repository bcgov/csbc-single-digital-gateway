/** A layout's authored spacing (doc 236 rule 9). */
export type LayoutGap = 'sm' | 'md' | 'lg';

export const DEFAULT_GAP: LayoutGap = 'md';

/** Each gap in rem — the studio's gridstack margin is half of it (rule 27). */
export const GAP_REM: Record<LayoutGap, number> = { sm: 0.5, md: 1, lg: 1.5 };

/** The literal class per gap, so Tailwind sees each one. */
export const GAP_CLASS: Record<LayoutGap, string> = { sm: 'gap-2', md: 'gap-4', lg: 'gap-6' };

/** `options.gap` sanitised: anything but `sm` / `md` / `lg` is the default. */
export function layoutGap(options: unknown): LayoutGap {
  const gap =
    typeof options === 'object' && options !== null
      ? (options as Record<string, unknown>)['gap']
      : undefined;
  return gap === 'sm' || gap === 'md' || gap === 'lg' ? gap : DEFAULT_GAP;
}
