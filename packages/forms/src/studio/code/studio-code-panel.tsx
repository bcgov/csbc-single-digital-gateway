import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@repo/ui/resizable';
import { useCallback, useId, type FC } from 'react';
import type { DocumentHalves } from '../use-studio-document';
import { CodePane } from './code-pane';
import { SCHEMA_METASCHEMA } from './metaschema/schema-metaschema';
import { UISCHEMA_METASCHEMA } from './metaschema/uischema-metaschema';
import { useCapabilities } from '../../renderers/studio/studio-capabilities';
import { governedSchemaValidator, governedUischemaValidator } from './validate-document';

export interface StudioCodePanelProps {
  readonly schema: JsonSchema;
  readonly uischema: UISchemaElement;
  /** `useStudioDocument().replaceDocument`. */
  readonly onReplace: (halves: DocumentHalves) => void;
}

/**
 * The bottom dock panel's code editors (doc 191 rules 1, 25): Schema and UI schema side by side, each writing its half
 * of the document back. `data-studio-code` keeps Escape typed here for Monaco. `nokey` keeps typing here from reaching an
 * editable Flow (doc 196 rule 8): xyflow deletes selected edges on a document-wide Backspace unless the target is an
 * input, contenteditable or inside `.nokey`, and Monaco 0.56's EditContext surface is none of those.
 */
export const StudioCodePanel: FC<StudioCodePanelProps> = ({ schema, uischema, onReplace }) => {
  const instanceId = useId();
  const applySchema = useCallback((next: JsonSchema) => onReplace({ schema: next }), [onReplace]);
  const applyUischema = useCallback(
    (next: UISchemaElement) => onReplace({ uischema: next }),
    [onReplace],
  );

  /**
   * Doc 222: this panel is the studio's own bypass — every gate doc 221 installed sits on an
   * affordance, and these panes replace a whole half of the document with hand-written JSON. The API
   * refuses such a save, so without this the author writes valid JSON, watches it apply, and meets an
   * unexplained 422. Refusing at the apply gate says which element and which setting instead.
   *
   * Rebuilt per render on purpose: `useCodeDocument` holds `validate` in a REF and reads it at call
   * time, so a fresh identity costs nothing here (unlike `loadDocument`, doc 200 rule 4b).
   */
  const governing = useCapabilities() ?? undefined;
  const current = { schema, uischema };
  const validateSchema = governedSchemaValidator(current, governing);
  const validateUischema = governedUischemaValidator(current, governing);

  return (
    <div data-studio-code="" className="nokey h-full">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="50%" minSize="20%">
          <CodePane
            kind="schema"
            label="Schema"
            instanceId={instanceId}
            metaschema={SCHEMA_METASCHEMA}
            value={schema}
            validate={validateSchema}
            apply={applySchema}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="50%" minSize="20%">
          <CodePane
            kind="uischema"
            label="UI schema"
            instanceId={instanceId}
            metaschema={UISCHEMA_METASCHEMA}
            value={uischema}
            validate={validateUischema}
            apply={applyUischema}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
