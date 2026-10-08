import type { ControlProps } from '@jsonforms/core';
import { useMemo } from 'react';
import { DataTableField } from '../ui/data-table-field';
import { referencesOf, referenceTypeOf } from '../ui/document-reference';
import { ReferenceTitle } from '../ui/reference-cards';
import { useReferenceSource } from '../ui/reference-source';

/**
 * A document reference read back (doc 287 rule 13): each referenced document's title — linked when the host gives
 * one — and its description, as a list. `PlainObjectArray` handles the none-written case.
 */
export function PlainDocumentReferences(props: ControlProps) {
  const type = referenceTypeOf(props.uischema);
  const source = useReferenceSource();
  const references = useMemo(() => referencesOf(props.data), [props.data]);
  return (
    <DataTableField props={props} component="document-reference">
      {(wiring) => (
        <ul data-slot="plain-document-references" {...wiring} className="flex flex-col gap-2">
          {references.map((reference) => (
            <li key={reference.id} className="flex flex-col text-sm">
              <span className="font-medium">
                <ReferenceTitle
                  reference={reference}
                  href={type === undefined ? undefined : source?.href?.(type, reference)}
                />
              </span>
              {reference.description !== undefined && (
                <span className="text-muted-foreground">{reference.description}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </DataTableField>
  );
}
