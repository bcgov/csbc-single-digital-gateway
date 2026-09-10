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
