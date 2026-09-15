import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@repo/ui/resizable';
import { useCallback, useId, type FC } from 'react';
import type { DocumentHalves } from '../use-studio-document';
import { CodePane } from './code-pane';
import { SCHEMA_METASCHEMA } from './metaschema/schema-metaschema';
import { UISCHEMA_METASCHEMA } from './metaschema/uischema-metaschema';
import { validateSchemaDocument, validateUischemaDocument } from './validate-document';

export interface StudioCodePanelProps {
  readonly schema: JsonSchema;
  readonly uischema: UISchemaElement;
  /** `useStudioDocument().replaceDocument`. */
  readonly onReplace: (halves: DocumentHalves) => void;
}

/**
 * The bottom dock panel's code editors (doc 191 rules 1, 25): Schema and UI schema side by side, each writing its half
 * of the document back. `data-studio-code` keeps Escape typed here for Monaco.
 */
export const StudioCodePanel: FC<StudioCodePanelProps> = ({ schema, uischema, onReplace }) => {
  const instanceId = useId();
  const applySchema = useCallback((next: JsonSchema) => onReplace({ schema: next }), [onReplace]);
  const applyUischema = useCallback(
    (next: UISchemaElement) => onReplace({ uischema: next }),
    [onReplace],
  );

  return (
    <div data-studio-code="" className="h-full">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="50%" minSize="20%">
          <CodePane
            kind="schema"
            label="Schema"
            instanceId={instanceId}
            metaschema={SCHEMA_METASCHEMA}
            value={schema}
            validate={validateSchemaDocument}
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
            validate={validateUischemaDocument}
            apply={applyUischema}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
