import '@testing-library/jest-dom/vitest';

// jsdom has no ResizeObserver, and xyflow constructs one to measure its canvas and nodes.
// A no-op is sufficient: jsdom never lays anything out, so there is nothing to observe.
if (globalThis.ResizeObserver === undefined) {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

// jsdom has no pointer capture, and gridstack's pointerdown handler (dd-touch) releases it on every press inside a
// draggable grid item — an uncaught TypeError in any test that presses one. No layout means nothing to capture.
for (const method of ['setPointerCapture', 'releasePointerCapture'] as const) {
  if (typeof Element.prototype[method] !== 'function') Element.prototype[method] = () => {};
}
if (typeof Element.prototype.hasPointerCapture !== 'function') {
  Element.prototype.hasPointerCapture = () => false;
}
