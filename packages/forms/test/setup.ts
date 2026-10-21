import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// Testing Library's 1s default for `findBy*` / `waitFor` is not enough for this package's heaviest mounts (the studio
// shell, the runner, gridstack and xyflow) when the suite runs its files in parallel: two tests failed intermittently
// at ~1050ms, passing alone every time. The wait is a CEILING, not a delay — a passing test returns as soon as its
// condition holds — so raising it costs nothing and removes the flake.
configure({ asyncUtilTimeout: 5000 });

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
