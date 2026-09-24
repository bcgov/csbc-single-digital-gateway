import type {
  JsonFormsCellRendererRegistryEntry,
  JsonFormsRendererRegistryEntry,
  UISchemaElement,
} from '@jsonforms/core';
import { useContext, useRef, type ComponentType } from 'react';
import { useGridEditor } from '../gridstack/grid-editor';
import { FLOW_TYPE, isFlowNodeType } from '../xyflow/flow-elements';
import { StudioContent } from './studio-content';
import { StudioItemContext } from './studio-item-context';
import { useSelectionPort } from './studio-selection';
import { grantsNothing, useCapability } from './studio-capabilities';

/** A stand-in so the capability hook runs unconditionally even for a renderer with no uischema. */
const EMPTY_ELEMENT = { type: 'Element' } as UISchemaElement;
import { StudioStageActions } from './studio-stage-actions';

interface FramedProps {
  uischema?: UISchemaElement;
  enabled?: boolean;
}

/**
 * Wraps a renderer or cell in the studio's management frame (doc 180 rules 16b-17c): a dashed
 * outline, then the original component rendered disabled and held inert. The element type is carried
 * as `data-element-type` only — no caption. The frame renders even when the element is hidden — the
 * wrapped renderer still applies its own visibility — so the studio shows every slot.
 *
 * Inside a studio grid item the item already draws the outline and disables its content, so the
 * renderer is returned bare.
 *
 * Under the Form Studio's selection port and Grid editor (doc 186 rules 1-2, 5) a frame — in practice the
 * root element's — carries `data-element-id` plus `data-hovered` / `data-selected`, which recolour its
 * outline like a grid item's. The root never shows an actions popover: it cannot be copied or deleted. A Stage's and a
 * Condition's frame show their Delete-only popover (doc 196 rule 9, doc 199 rule 31).
 */
export function withStudioFrame<P extends FramedProps>(
  Renderer: ComponentType<P>,
): ComponentType<P> {
  // eslint-disable-next-line unicorn/consistent-function-scoping -- captures Renderer, referenced only as JSX, which the rule does not see
  function StudioFrame(props: P) {
    const insideGridItem = useContext(StudioItemContext);
    const selection = useSelectionPort();
    const editor = useGridEditor();
    const frameRef = useRef<HTMLDivElement>(null);
    // Declared BEFORE the early return: a hook may not be called conditionally, and this component
    // returns early for a framed grid item.
    const capability = useCapability(props.uischema ?? EMPTY_ELEMENT);
    if (insideGridItem) return <Renderer {...props} />;

    const type = props.uischema?.type ?? 'Element';
    const id = selection && editor && props.uischema ? editor.idOf(props.uischema) : undefined;
    const hovered = id !== undefined && selection?.hoveredId === id;
    const selected = id !== undefined && selection?.selectedId === id;
    // Doc 221: what a GOVERNING template permits. Ungoverned resolves to FULLY_GRANTED, so `locked`
    // is false and everything below behaves exactly as it did before this feature.
    const locked = grantsNothing(capability);
    // Generic props can't take a JSX `enabled={false}` override, hence the spread-and-cast.
    const disabled = { ...props, enabled: false } as P;
    // Doc 195 rule 23: a Flow's canvas fills the centre panel, so its frame does.
    const fill = type === FLOW_TYPE ? 'h-full ' : '';
    return (
      <div
        ref={frameRef}
        data-slot="studio-element"
        data-element-type={type}
        data-element-id={id}
        data-hovered={hovered ? '' : undefined}
        data-selected={selected ? '' : undefined}
        data-locked={locked ? '' : undefined}
        // Arbitrary `data-[…]` variants, not `data-selected:`: the imported shadcn stylesheet redefines
        // `data-selected` as a custom variant for `[data-selected="true"]`, which a presence flag never matches.
        className={`${fill}rounded-sm border border-dashed border-border p-2 data-[hovered]:border-ring data-[selected]:border-ring data-[selected]:border-solid data-[locked]:cursor-not-allowed data-[locked]:border-muted-foreground/30`}
      >
        <StudioContent type={type}>
          <Renderer {...disabled} />
        </StudioContent>
        {/* Doc 199 rule 31: a Condition gets the same Delete-only popover a Stage has. */}
        {isFlowNodeType(type) && selection && id !== undefined && capability.remove ? (
          <StudioStageActions
            elementId={id}
            label={`${type} actions`}
            open={(hovered || selected) && !selection.gesturing}
            frameRef={frameRef}
            selection={selection}
          />
        ) : null}
      </div>
    );
  }
  StudioFrame.displayName = `StudioFrame(${Renderer.displayName || Renderer.name || 'Renderer'})`;
  return StudioFrame;
}

/** Frames every renderer 1:1, keeping each tester by reference so dispatch is unchanged. */
export function frameRenderers(
  entries: readonly JsonFormsRendererRegistryEntry[],
): JsonFormsRendererRegistryEntry[] {
  return entries.map(({ tester, renderer }) => ({ tester, renderer: withStudioFrame(renderer) }));
}

/** Frames every cell 1:1, keeping each tester by reference so dispatch is unchanged. */
export function frameCells(
  entries: readonly JsonFormsCellRendererRegistryEntry[],
): JsonFormsCellRendererRegistryEntry[] {
  return entries.map(({ tester, cell }) => ({ tester, cell: withStudioFrame(cell) }));
}
