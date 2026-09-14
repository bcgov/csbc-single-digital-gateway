import '@testing-library/jest-dom/vitest';

// jsdom has no ResizeObserver, and gridstack.js constructs one when a grid initialises (doc 180).
// A no-op is sufficient: jsdom never lays anything out, so there is nothing to observe.
if (globalThis.ResizeObserver === undefined) {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

// jsdom has no pointer capture, and gridstack's pointer handlers (dd-touch) call
// `releasePointerCapture` on every pointerdown over a grid item (doc 185). Same stub as @repo/ui's setup.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
