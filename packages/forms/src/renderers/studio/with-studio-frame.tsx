import type {
  JsonFormsCellRendererRegistryEntry,
  JsonFormsRendererRegistryEntry,
  UISchemaElement,
} from '@jsonforms/core';
import { useContext, type ComponentType } from 'react';
import { StudioContent } from './studio-content';
import { StudioItemContext } from './studio-item-context';

interface FramedProps {
  uischema?: UISchemaElement;
  enabled?: boolean;
}

/**
 * Wraps a renderer or cell in the studio's management frame (doc 180 rules 16b-17c): a dashed
 * outline with a caption naming the element type, then the original component rendered disabled and
 * held inert. The frame renders even when the element is hidden — the wrapped renderer still applies
 * its own visibility — so the studio shows every slot.
 *
 * Inside a studio grid item the item already draws the outline and caption and disables its content,
 * so the renderer is returned bare.
 */
export function withStudioFrame<P extends FramedProps>(
  Renderer: ComponentType<P>,
): ComponentType<P> {
  // eslint-disable-next-line unicorn/consistent-function-scoping -- captures Renderer, referenced only as JSX, which the rule does not see
  function StudioFrame(props: P) {
    const insideGridItem = useContext(StudioItemContext);
    if (insideGridItem) return <Renderer {...props} />;

    const type = props.uischema?.type ?? 'Element';
    // Generic props can't take a JSX `enabled={false}` override, hence the spread-and-cast.
    const disabled = { ...props, enabled: false } as P;
    return (
      <div
        data-slot="studio-element"
        data-element-type={type}
        className="relative rounded-sm border border-dashed border-border p-2 pt-6"
      >
        <span
          data-slot="studio-element-caption"
          className="absolute top-1 left-2 text-xs text-muted-foreground"
        >
          {type}
        </span>
        <StudioContent type={type}>
          <Renderer {...disabled} />
        </StudioContent>
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
