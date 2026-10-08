import type { ControlProps } from '@jsonforms/core';
import { useMemo } from 'react';
import { DataTableField } from '../ui/data-table-field';
import { referencesOf, referenceTypeOf } from '../ui/document-reference';
import { ReferenceCards, referenceTitle } from '../ui/reference-cards';
import { useReferenceSource } from '../ui/reference-source';

/**
 * A document reference read back (doc 287 rule 13): the same card grid the fill control draws, without Remove
 * buttons — a plain title list when the document type is unknown. `PlainObjectArray` handles the none-written case.
 */
export function PlainDocumentReferences(props: ControlProps) {
  const type = referenceTypeOf(props.uischema);
  const source = useReferenceSource();
  const references = useMemo(() => referencesOf(props.data), [props.data]);
  return (
    <DataTableField props={props} component="document-reference">
      {(wiring) => (
        <div data-slot="plain-document-references" {...wiring}>
          {type === undefined ? (
            <ul className="flex flex-col gap-2 text-sm">
              {references.map((reference) => (
                <li key={reference.id}>{referenceTitle(reference)}</li>
              ))}
            </ul>
          ) : (
            <ReferenceCards
              type={type}
              references={references}
              hrefOf={(reference) => source?.href?.(type, reference)}
            />
          )}
        </div>
      )}
    </DataTableField>
  );
}
