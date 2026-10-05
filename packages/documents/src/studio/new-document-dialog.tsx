import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@repo/ui/field';
import { RadioGroup, RadioGroupItem } from '@repo/ui/radio-group';
import { Switch } from '@repo/ui/switch';
import { useId, useState } from 'react';
import {
  DOCUMENT_TYPE_INFO,
  DOCUMENT_TYPES,
  type DocumentKind,
  type DocumentType,
} from './document-types';
import type { DocumentSummary } from './document-store';

export interface NewDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselections — e.g. a host that already knows the kind but not the type. */
  kind?: DocumentKind | undefined;
  type?: DocumentType | undefined;
  /** Every template the store holds; those of the chosen type are offered as Start from (doc 259 rule 1). */
  templates?: readonly DocumentSummary[] | undefined;
  /** `fromTemplate`: the template a document starts from; absent = blank. */
  onCreate: (kind: DocumentKind, type: DocumentType, fromTemplate?: string) => void;
}

/** Start from's value for a blank document. */
const BLANK = 'blank';

/** The type chosen when the host preselects none. */
const DEFAULT_TYPE: DocumentType = 'services.service';

function isDocumentType(value: unknown): value is DocumentType {
  return (DOCUMENT_TYPES as readonly unknown[]).includes(value);
}

/** Choose a new document's type (choice cards, Service unless the host preselects one) and whether it is a template. */
export function NewDocumentDialog({
  open,
  onOpenChange,
  kind,
  type,
  templates = [],
  onCreate,
}: NewDocumentDialogProps) {
  const id = useId();
  const [chosenType, setChosenType] = useState<DocumentType | undefined>(type ?? DEFAULT_TYPE);
  const [template, setTemplate] = useState(kind === 'template');
  const [from, setFrom] = useState(BLANK);
  const offered = templates.filter((summary) => summary.type === chosenType);
  // Rule 1: only for a document, and only when there is a template of the chosen type to start from.
  const startFrom = !template && offered.length > 0 ? offered : [];
  const fromTemplate = startFrom.some((summary) => summary.id === from) ? from : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New document</DialogTitle>
          <DialogDescription>Choose what you are creating.</DialogDescription>
        </DialogHeader>
        <RadioGroup
          aria-label="Document type"
          value={chosenType ?? null}
          onValueChange={(value) => {
            setChosenType(isDocumentType(value) ? value : undefined);
            setFrom(BLANK);
          }}
        >
          {DOCUMENT_TYPES.map((value) => (
            <FieldLabel key={value} htmlFor={`${id}-${value}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{DOCUMENT_TYPE_INFO[value].label}</FieldTitle>
                  <FieldDescription>{DOCUMENT_TYPE_INFO[value].description}</FieldDescription>
                </FieldContent>
                <RadioGroupItem value={value} id={`${id}-${value}`} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
        {startFrom.length > 0 && (
          <Field>
            <FieldTitle id={`${id}-from`}>Start from</FieldTitle>
            <RadioGroup
              aria-label="Start from"
              value={from}
              onValueChange={(value) => setFrom(typeof value === 'string' ? value : BLANK)}
            >
              {[{ id: BLANK, name: 'Blank' }, ...startFrom].map((option) => (
                <Field key={option.id} orientation="horizontal">
                  <RadioGroupItem value={option.id} id={`${id}-from-${option.id}`} />
                  <FieldLabel htmlFor={`${id}-from-${option.id}`}>{option.name}</FieldLabel>
                </Field>
              ))}
            </RadioGroup>
          </Field>
        )}
        <Field orientation="horizontal">
          <FieldLabel htmlFor={`${id}-template`}>This document is a template</FieldLabel>
          <Switch id={`${id}-template`} checked={template} onCheckedChange={setTemplate} />
        </Field>
        <DialogFooter>
          <Button
            disabled={chosenType === undefined}
            onClick={() => {
              if (chosenType === undefined) return;
              if (template) onCreate('template', chosenType);
              else onCreate('document', chosenType, fromTemplate);
              onOpenChange(false);
            }}
          >
            Next
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
