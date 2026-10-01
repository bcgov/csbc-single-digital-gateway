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
