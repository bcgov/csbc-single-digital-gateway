import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Field, FieldError, FieldLabel, FieldTitle } from '@repo/ui/field';
import { Input } from '@repo/ui/input';
import { RadioGroup, RadioGroupItem } from '@repo/ui/radio-group';
import { useEffect, useId, useState } from 'react';
import { DOCUMENT_TYPE_INFO, type DocumentType } from '../../studio/document-types';
import { toReference, type DocumentReference } from './document-reference';
import type { DocumentReferenceSource, ReferenceTemplate } from './reference-source';

/** The longest title a created document may take (rule 8). */
export const CREATE_TITLE_MAX = 200;

type Templates =
  | { state: 'loading' }
  | { state: 'ready'; templates: ReferenceTemplate[] }
  | { state: 'error' };

function useTemplates(source: DocumentReferenceSource, type: DocumentType, open: boolean) {
  const [templates, setTemplates] = useState<Templates>({ state: 'loading' });
  useEffect(() => {
    if (!open) return;
    let current = true;
    setTemplates({ state: 'loading' });
    source.templates(type).then(
      (list) => current && setTemplates({ state: 'ready', templates: list }),
      (error: unknown) => {
        console.error(`[DocumentReference] listing ${type} templates failed`, error);
        if (current) setTemplates({ state: 'error' });
      },
    );
    return () => {
      current = false;
    };
  }, [source, type, open]);
  return templates;
}

/**
 * Create new (rule 8): a title and one of the type's published templates — the only one preselected — then the host
 * creates the document and its reference is appended. A failure keeps the dialog open with the error.
 */
export function CreateReferenceDialog({
  open,
  onOpenChange,
  source,
  type,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: DocumentReferenceSource;
  type: DocumentType;
  onCreated: (reference: DocumentReference) => void;
}) {
  const id = useId();
  const label = DOCUMENT_TYPE_INFO[type].label;
  const templates = useTemplates(source, type, open);
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const offered = templates.state === 'ready' ? templates.templates : [];
  const only = offered.length === 1 ? offered[0]?.id : undefined;
  const templateId = offered.some((template) => template.id === picked) ? picked : only;
  const trimmed = title.trim();
  const valid = trimmed !== '' && trimmed.length <= CREATE_TITLE_MAX && templateId !== undefined;

  const close = (next: boolean) => {
    if (!next) {
      setTitle('');
      setPicked(undefined);
      setError(undefined);
    }
    onOpenChange(next);
  };
  const create = () => {
    if (!valid || busy || templateId === undefined) return;
    setBusy(true);
    setError(undefined);
    source
      .create(type, { title: trimmed, templateId })
      .then((created) => {
        onCreated(toReference(created));
        close(false);
      })
      .catch((reason: unknown) => {
        console.error(`[DocumentReference] creating a ${type} failed`, reason);
        setError(reason instanceof Error ? reason.message : `Couldn't create the ${label}.`);
      })
      .finally(() => setBusy(false));
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent data-slot="create-reference-dialog">
        <DialogHeader>
          <DialogTitle>New {label.toLowerCase()}</DialogTitle>
          <DialogDescription>
            It is created as its own document and referenced here.
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor={`${id}-title`}>Title</FieldLabel>
          <Input
            id={`${id}-title`}
            value={title}
            maxLength={CREATE_TITLE_MAX}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        {templates.state === 'loading' && (
          <p className="text-sm text-muted-foreground">Loading templates…</p>
        )}
        {templates.state === 'error' && (
          <p role="alert" className="text-sm text-destructive">
            Couldn&apos;t load templates.
          </p>
        )}
        {templates.state === 'ready' && offered.length === 0 && (
          <p data-slot="create-reference-no-template" className="text-sm text-muted-foreground">
            No published template for {label}
          </p>
        )}
        {offered.length > 0 && (
          <Field>
            <FieldTitle>Template</FieldTitle>
            <RadioGroup
              aria-label="Template"
              value={templateId ?? null}
              onValueChange={(value) => setPicked(typeof value === 'string' ? value : undefined)}
            >
              {offered.map((template) => (
                <Field key={template.id} orientation="horizontal">
                  <RadioGroupItem value={template.id} id={`${id}-t-${template.id}`} />
                  <FieldLabel htmlFor={`${id}-t-${template.id}`}>{template.title}</FieldLabel>
                </Field>
              ))}
            </RadioGroup>
          </Field>
        )}
        {error !== undefined && <FieldError>{error}</FieldError>}
        <DialogFooter>
          <Button type="button" disabled={!valid || busy} onClick={create}>
            {busy ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
