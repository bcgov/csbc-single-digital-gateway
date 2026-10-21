import type { UISchemaElement } from '@jsonforms/core';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { FULLY_GRANTED, type CapabilityMap } from '../src/capabilities/index';
import {
  CapabilityProvider,
  grantsNothing,
  useCapabilities,
  useCapability,
} from '../src/renderers/studio/studio-capabilities';

// Doc 221 — the GOVERNING capability map reaches the studio through a provider, never as seeded
// document state.
//
// It mirrors StudioSelection / GridEditor / FlowEditor / TabsEditor exactly, including the default:
// NO PROVIDER = UNGOVERNED, as those give "no provider = view-only". That default is what keeps every
// untemplated document — and /admin/studio — behaving exactly as it does today.

const el = (type: string, id?: string) =>
  ({ type, ...(id === undefined ? {} : { id }) }) as UISchemaElement;

const CLOSED = {
  edit: 'none',
  remove: false,
  move: false,
  addChildren: false,
  removeChildren: false,
  reorderChildren: false,
  edges: false,
} as const;

const wrapper = (value: CapabilityMap) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <CapabilityProvider value={value}>{children}</CapabilityProvider>;
  };

describe('useCapabilities', () => {
  it('returns null when there is no provider — ungoverned (rule 1)', () => {
    const { result } = renderHook(() => useCapabilities());
    expect(result.current).toBeNull();
  });

  it('returns the provided map inside a CapabilityProvider', () => {
    const map: CapabilityMap = { default: { '*': CLOSED } };
    const { result } = renderHook(() => useCapabilities(), { wrapper: wrapper(map) });
    expect(result.current).toBe(map);
  });
});

describe('the ungoverned default', () => {
  it('grants every verb when no provider is present', () => {
    const { result } = renderHook(() => useCapability(el('Control', 'a1')));
    expect(result.current).toEqual(FULLY_GRANTED);
  });

  it('grants every verb for an element the map has never heard of (rule 2)', () => {
    const map: CapabilityMap = { elements: { somethingElse: CLOSED } };
    const { result } = renderHook(() => useCapability(el('Control', 'unknown1')), {
      wrapper: wrapper(map),
    });
    expect(result.current).toEqual(FULLY_GRANTED);
  });

  it('needs no branch at a call site — ungoverned falls out of the same code path', () => {
    // The property that makes threading this through nine gates safe: a gate reads a capability and
    // acts on it, rather than each gate remembering to check whether a map exists.
    const { result } = renderHook(() => useCapability(el('Grid', 'g1')));
    expect(result.current.addChildren).toBe(true);
    expect(result.current.remove).toBe(true);
  });
});

describe('useCapability resolves through capabilityFor', () => {
  it('applies the full merge chain, not a raw map lookup', () => {
    const map: CapabilityMap = {
      default: { '*': CLOSED, Control: { edit: ['label'] } },
      elements: { a1: { remove: true } },
    };
    const { result } = renderHook(() => useCapability(el('Control', 'a1')), {
      wrapper: wrapper(map),
    });
    expect(result.current.remove).toBe(true); // stated by the element
    expect(result.current.edit).toEqual(['label']); // inherited from the type
    expect(result.current.move).toBe(false); // inherited from the baseline
  });

  it('resolves a different element of the same type independently', () => {
    const map: CapabilityMap = {
      default: { '*': CLOSED, Control: { edit: ['label'] } },
      elements: { a1: { remove: true } },
    };
    const { result } = renderHook(() => useCapability(el('Control', 'a2')), {
      wrapper: wrapper(map),
    });
    expect(result.current.remove).toBe(false);
  });
});

describe('grantsNothing — what makes an element unselectable (rule 3)', () => {
  const of = (map: CapabilityMap, element: UISchemaElement) =>
    renderHook(() => useCapability(element), { wrapper: wrapper(map) }).result.current;

  it('is false when the element grants at least one thing', () => {
    const map: CapabilityMap = { default: { '*': CLOSED }, elements: { a1: { remove: true } } };
    expect(grantsNothing(of(map, el('Control', 'a1')))).toBe(false);
  });

  it('is false for a frozen-validation field whose label is still editable', () => {
    const map: CapabilityMap = {
      default: { '*': CLOSED },
      elements: { a1: { edit: ['label'] } },
    };
    expect(grantsNothing(of(map, el('Control', 'a1')))).toBe(false);
  });

  it('is true when the element permits no action whatsoever', () => {
    const map: CapabilityMap = { default: { '*': CLOSED } };
    expect(grantsNothing(of(map, el('Control', 'a1')))).toBe(true);
  });

  it("treats an EMPTY edit list as nothing, like 'none'", () => {
    const map: CapabilityMap = {
      default: { '*': CLOSED },
      elements: { a1: { edit: [] } },
    };
    // Otherwise a locked element stays selectable with an empty inspector, which reads as a bug.
    expect(grantsNothing(of(map, el('Control', 'a1')))).toBe(true);
  });

  it('is false when ungoverned', () => {
    const { result } = renderHook(() => useCapability(el('Control', 'a1')));
    expect(grantsNothing(result.current)).toBe(false);
  });
});
