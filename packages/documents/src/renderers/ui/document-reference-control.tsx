import {
  and,
  optionIs,
  rankWith,
  schemaMatches,
  uiTypeIs,
  type ControlProps,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/alert-dialog';
import { Button } from '@repo/ui/button';
import { useMemo, useState } from 'react';
import { DOCUMENT_TYPE_INFO, type DocumentType } from '../../studio/document-types';
import { CreateReferenceDialog } from './create-reference-dialog';
import { DataTableField } from './data-table-field';
import {
  appendReferences,
  DOCUMENT_REFERENCE_COMPONENT,
  referencesOf,
  referenceTypeOf,
  REFERENCE_POLICY,
  removeReference,
  type DocumentReference,
} from './document-reference';
import { isObjectArray } from './object-array';
import { PickReferenceDialog } from './pick-reference-dialog';
import { ReferenceCards, referenceTitle } from './reference-cards';
import { useReferenceSource, type DocumentReferenceSource } from './reference-source';

/** Above the object array's rank-1 table; disjoint from the record and accordion by option (rule 1). */
export const documentReferenceControlTester = rankWith(
  2,
  and(
    uiTypeIs('Control'),
    optionIs('component', DOCUMENT_REFERENCE_COMPONENT),
    schemaMatches((schema) => isObjectArray(schema)),
  ),
);

/** The hint under disabled actions when no host provides documents (rule 10). */
export const NO_SOURCE_HINT = 'Available when filling a document';

/** A remove that deletes the referenced document first asks (rule 9). */
function DeleteConfirm({
  reference,
  type,
  error,
  busy,
  onCancel,
  onConfirm,
}: {
  reference: DocumentReference | undefined;
  type: DocumentType;
  error: string | undefined;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const label = DOCUMENT_TYPE_INFO[type].label.toLowerCase();
  return (
    <AlertDialog open={reference !== undefined} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {reference === undefined ? '' : referenceTitle(reference)}?
          </AlertDialogTitle>
          <AlertDialogDescription>This deletes the {label} document.</AlertDialogDescription>
        </AlertDialogHeader>
        {error !== undefined && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={busy} onClick={onConfirm}>
            {busy ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Rule 9: remove, deleting the document first under `deleteOnRemove`; a failed delete keeps the reference. */
function useRemoval(
  source: DocumentReferenceSource | null,
  type: DocumentType,
  remove: (id: string) => void,
) {
  const [confirming, setConfirming] = useState<DocumentReference | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const request = (reference: DocumentReference) => {
    if (!REFERENCE_POLICY[type].deleteOnRemove) return remove(reference.id);
    setError(undefined);
    setConfirming(reference);
  };
  const confirm = () => {
    if (confirming === undefined || source === null || busy) return;
    setBusy(true);
    source
      .remove(type, confirming.id)
      .then(() => {
        remove(confirming.id);
        setConfirming(undefined);
      })
      .catch((reason: unknown) => {
        console.error(`[DocumentReference] deleting ${type} ${confirming.id} failed`, reason);
        setError(reason instanceof Error ? reason.message : 'Couldn’t delete the document.');
      })
      .finally(() => setBusy(false));
  };
  return { confirming, busy, error, request, confirm, cancel: () => setConfirming(undefined) };
}

function ReferenceActions({
  type,
  source,
  references,
  onAdd,
}: {
  type: DocumentType;
  source: DocumentReferenceSource | null;
  references: readonly DocumentReference[];
  onAdd: (added: DocumentReference[]) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);
  const policy = REFERENCE_POLICY[type];
  const label = DOCUMENT_TYPE_INFO[type].label.toLowerCase();
  const referenced = useMemo(() => new Set(references.map((r) => r.id)), [references]);
  return (
    <div data-slot="reference-actions" className="flex flex-wrap items-center gap-2">
      {policy.pick && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={source === null}
          onClick={() => setPicking(true)}
        >
          <Icon path={mdiPlus} size="0.875rem" aria-hidden />
          Add existing
        </Button>
      )}
      {policy.create && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={source === null}
          onClick={() => setCreating(true)}
        >
          <Icon path={mdiPlus} size="0.875rem" aria-hidden />
          Create new {label}
        </Button>
      )}
      {source === null && <span className="text-xs text-muted-foreground">{NO_SOURCE_HINT}</span>}
      {source !== null && policy.pick && (
        <PickReferenceDialog
          open={picking}
          onOpenChange={setPicking}
          source={source}
          type={type}
          referenced={referenced}
          onAdd={onAdd}
        />
      )}
      {source !== null && policy.create && (
        <CreateReferenceDialog
          open={creating}
          onOpenChange={setCreating}
          source={source}
          type={type}
          onCreated={(reference) => onAdd([reference])}
        />
      )}
    </div>
  );
}

/**
 * A document reference (doc 287 rules 2-12): the chosen documents as a card grid, then the actions its document type
 * allows. Disabled, it only lists them; without a host, it lists them and its actions are disabled.
 */
export function DocumentReferenceControl(props: ControlProps) {
  const { data, uischema, enabled, handleChange, path } = props;
  const type = referenceTypeOf(uischema);
  const source = useReferenceSource();
  const references = useMemo(() => referencesOf(data), [data]);
  const removal = useRemoval(source, type ?? 'services.service', (id) =>
    handleChange(path, removeReference(references, id)),
  );
  const hrefOf = (reference: DocumentReference) =>
    type === undefined ? undefined : source?.href?.(type, reference);
  return (
    <DataTableField props={props} component="document-reference">
      {(wiring) => (
        <div
          data-slot="document-reference"
          data-document-type={type}
          role="group"
          {...wiring}
          className="flex flex-col items-stretch gap-3"
        >
          {type === undefined ? (
            <p className="text-sm text-muted-foreground">
              Choose a document type in the inspector.
            </p>
          ) : (
            <>
              {references.length > 0 ? (
                <ReferenceCards
                  type={type}
                  references={references}
                  hrefOf={hrefOf}
                  onRemove={enabled ? removal.request : undefined}
                />
              ) : (
                <p data-slot="document-reference-empty" className="text-sm text-muted-foreground">
                  None yet.
                </p>
              )}
              {enabled && (
                <ReferenceActions
                  type={type}
                  source={source}
                  references={references}
                  onAdd={(added) => handleChange(path, appendReferences(references, added))}
                />
              )}
              <DeleteConfirm
                reference={removal.confirming}
                type={type}
                error={removal.error}
                busy={removal.busy}
                onCancel={removal.cancel}
                onConfirm={removal.confirm}
              />
            </>
          )}
        </div>
      )}
    </DataTableField>
  );
}

export const documentReferenceControlEntry = {
  tester: documentReferenceControlTester,
  renderer: withJsonFormsControlProps(DocumentReferenceControl),
};
