import { afterAll, beforeAll } from 'vitest';

// What @xyflow/react needs from jsdom to measure nodes and draw edges (doc 195), installed per test file so gridstack
// tests keep the no-op ResizeObserver from setup.ts: an observer that reports each element as soon as it is observed,
// element sizes read from inline styles (else 1px), SVG bounding boxes, and DOMMatrixReadOnly for the viewport zoom.

class ReportingResizeObserver {
  readonly #callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
  }

  observe(target: Element): void {
    // Only xyflow's own elements are reported. Everything else (react-resizable-panels, gridstack size-to-content) keeps
    // setup.ts's never-reporting behaviour, which their jsdom tests are written against.
    if (!target.closest('.react-flow')) return;
    // xyflow's viewport observer reads the entry's contentRect; nodes are measured from offsetWidth/offsetHeight.
    const { width, height } = (target as HTMLElement).style;
    const contentRect = {
      width: Number.parseFloat(width) || 1,
      height: Number.parseFloat(height) || 1,
    };
    // Asynchronous, like a real observer: xyflow drops a node update that arrives before its viewport is stored, and a
    // dropped update leaves the node without handle bounds, so its edges never draw.
    setTimeout(() => {
      this.#callback(
        [{ target, contentRect } as unknown as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      );
    }, 0);
  }

  unobserve(): void {}

  disconnect(): void {}
}

class ScaleMatrix {
  readonly m22: number;

  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([\d.]+)\)/)?.[1];
    this.m22 = scale === undefined ? 1 : Number(scale);
  }
}

const sizeFrom = (dimension: 'height' | 'width') =>
  function (this: HTMLElement) {
    return Number.parseFloat(this.style[dimension]) || 1;
  };

/** Installs the xyflow jsdom shims before the calling file's tests and restores the originals after them. */
export function useXyflowJsdom(): void {
  const originals = {
    resizeObserver: globalThis.ResizeObserver,
    domMatrix: globalThis.DOMMatrixReadOnly,
    offsetHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight'),
    offsetWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth'),
    getBBox: (SVGElement.prototype as { getBBox?: unknown }).getBBox,
  };

  beforeAll(() => {
    globalThis.ResizeObserver = ReportingResizeObserver as unknown as typeof ResizeObserver;
    globalThis.DOMMatrixReadOnly = ScaleMatrix as unknown as typeof DOMMatrixReadOnly;
    Object.defineProperties(HTMLElement.prototype, {
      offsetHeight: { configurable: true, get: sizeFrom('height') },
      offsetWidth: { configurable: true, get: sizeFrom('width') },
    });
    Object.defineProperty(SVGElement.prototype, 'getBBox', {
      configurable: true,
      value: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    });
  });

  afterAll(() => {
    globalThis.ResizeObserver = originals.resizeObserver;
    globalThis.DOMMatrixReadOnly = originals.domMatrix;
    for (const key of ['offsetHeight', 'offsetWidth'] as const) {
      const descriptor = originals[key];
      if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor);
    }
    Object.defineProperty(SVGElement.prototype, 'getBBox', {
      configurable: true,
      value: originals.getBBox,
    });
  });
}
