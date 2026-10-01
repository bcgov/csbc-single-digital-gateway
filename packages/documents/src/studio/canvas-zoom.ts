import { getViewportForBounds, type Rect, type Viewport } from '@xyflow/react';

/**
 * How long a focus change takes. The node's morph, the fades and the camera all share this duration AND one easing
 * curve, so the card grows on screen exactly as fast as the camera closes in on it — a zoom, not a grow-then-scroll.
 */
const ZOOM_MS = 300;

/** easeInOutCubic: the camera's curve. `MOTION` below is the same curve in CSS — keep the two in step. */
export const ease = (t: number): number => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** The CSS half of the shared motion (literal so Tailwind generates it): duration, easeInOutCubic, reduced-motion off. */
export const MOTION =
  'duration-300 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none motion-reduce:animate-none';

/**
 * Opacity-only fades on the shared motion (keyframes in styles.css). Never tw-animate's `animate-in` on a node: it
 * animates `transform`, which xyflow positions nodes with.
 */
export const FADE_IN =
  'animate-[document-studio-fade-in_300ms_cubic-bezier(0.65,0,0.35,1)_both] motion-reduce:animate-none';
export const FADE_OUT =
  'animate-[document-studio-fade-out_300ms_cubic-bezier(0.65,0,0.35,1)_both] motion-reduce:animate-none';
/**
 * Back: a quick fade-in that waits out the shrink (its delay is the shared duration — keep it in step with ZOOM_MS), for what must not be seen until the
 * page is a card again. `both` holds it invisible through the delay.
 */
export const FADE_IN_AFTER =
  'animate-[document-studio-fade-in_200ms_ease-out_300ms_both] motion-reduce:animate-none';

/** How long Back's stages run: the shrink, then `FADE_IN_AFTER`'s fade. */
export const backDuration = (): number => (zoomDuration() === 0 ? 0 : ZOOM_MS + 200);

/** The duration: instant under `prefers-reduced-motion: reduce` (doc 233 rule 7). */
export function zoomDuration(): number {
  const reduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reduce ? 0 : ZOOM_MS;
}

/** The camera motion every focus zoom shares. */
interface Motion {
  duration: number;
  ease: (t: number) => number;
  interpolate: 'linear';
}

/** The slice of a ReactFlow instance the zoom uses. */
export interface Zoomable {
  fitBounds(bounds: Rect, options: Motion & { padding: number }): Promise<boolean>;
  getViewport(): Viewport;
  setViewport(viewport: Viewport, options: Motion): Promise<boolean>;
}

const motion = (): Motion => ({ duration: zoomDuration(), ease, interpolate: 'linear' });
const logFailure = (error: unknown) => console.error('[documents] canvas zoom failed', error);

/**
 * Animates the camera onto `bounds` alongside the morph. `linear` interpolation: d3's default `smooth` path zooms OUT
 * before zooming in on a distant target, which reads as a scroll. A failure is logged, never thrown.
 */
export function zoomToBounds(instance: Zoomable | null, bounds: Rect, padding: number): void {
  instance?.fitBounds(bounds, { padding, ...motion() }).catch(logFailure);
}

/** Puts the camera on `bounds` at once — a page that is already open when the canvas mounts. */
export function fitNow(instance: Zoomable | null, bounds: Rect, padding: number): void {
  instance?.fitBounds(bounds, { padding, ...motion(), duration: 0 }).catch(logFailure);
}

/** Animates the camera back to a viewport it held before — Back returning to where the author was (doc 233 rule 5). */
export function zoomToViewport(instance: Zoomable | null, viewport: Viewport): void {
  instance?.setViewport(viewport, motion()).catch(logFailure);
}

/** The zoom range the studio canvas allows (its `minZoom`, and xyflow's default `maxZoom`). */
export const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;

/**
 * The viewport that fits `bounds` into a `width` × `height` canvas — xyflow's own fit, so a resize lands exactly where
 * a fresh zoom-in would (doc 233 rule 15) — except that whatever flow y sat at the top of `current` stays at the top,
 * so a resize never undoes the author's scroll. A narrower canvas shrinks the page; a wider one grows it.
 */
export function refitViewport(
  current: Viewport,
  bounds: Rect,
  width: number,
  height: number,
  padding: number,
): Viewport {
  const fitted = getViewportForBounds(bounds, width, height, MIN_ZOOM, MAX_ZOOM, padding);
  const topY = -current.y / current.zoom;
  return { x: fitted.x, y: -topY * fitted.zoom, zoom: fitted.zoom };
}

/** Puts the camera on `viewport` at once. */
export function setViewportNow(instance: Zoomable | null, viewport: Viewport): void {
  instance?.setViewport(viewport, { ...motion(), duration: 0 }).catch(logFailure);
}
